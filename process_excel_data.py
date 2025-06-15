#!/usr/bin/env python3
"""
Process Excel data and convert to OOTB scenarios format
"""
import json
import ast
from collections import defaultdict
from models import Tag

def process_excel_scenarios():
    """Convert Excel data to OOTB scenarios format"""
    
    # Load the JSON data
    with open('attached_assets/scenarios_data.json', 'r') as f:
        raw_data = json.load(f)
    
    # Group by Parent_ID to create parent-child relationships
    parent_groups = defaultdict(list)
    for row in raw_data:
        if row.get('Parent_ID'):
            parent_groups[row['Parent_ID']].append(row)
    
    # Available tags
    available_tags = Tag.get_available_tags()
    tag_map = {tag.name: tag for tag in available_tags}
    
    ootb_scenarios = []
    
    for parent_id, children in parent_groups.items():
        if not children:
            continue
            
        # Get parent info from first child
        first_child = children[0]
        parent_name = first_child.get('Parent scenario', '').strip()
        if not parent_name:
            continue
            
        # Determine tag based on domain combination
        domain_combo = first_child.get('Domain_combination', '')
        if 'AE' in domain_combo:
            tag = tag_map.get('Safety', tag_map['Other'])
        elif 'CM' in domain_combo or 'EX' in domain_combo:
            tag = tag_map.get('Compliance', tag_map['Other'])
        elif 'DM' in domain_combo or 'VS' in domain_combo:
            tag = tag_map.get('Data Quality', tag_map['Other'])
        else:
            tag = tag_map['Other']
        
        # Process child scenarios
        child_scenarios = []
        for child_row in children:
            if not child_row.get('Simplified Child Scenario'):
                continue
                
            # Parse needed columns
            needed_cols = []
            try:
                cols_str = child_row.get('Needed cols', '[]')
                if cols_str and cols_str != 'null':
                    needed_cols = ast.literal_eval(cols_str)
            except:
                needed_cols = []
            
            # Extract domains from needed columns
            domains = set()
            for col in needed_cols:
                if col.startswith('AE'):
                    domains.add('AE')
                elif col.startswith('CM'):
                    domains.add('CM')
                elif col.startswith('DM'):
                    domains.add('DM')
                elif col.startswith('VS'):
                    domains.add('VS')
                elif col.startswith('LB'):
                    domains.add('LB')
                elif col.startswith('EX'):
                    domains.add('EX')
                elif col.startswith('DS'):
                    domains.add('DS')
            
            # Create reasoning template from rules
            rules = child_row.get('Rules in Standard format', '')
            scenario_desc = child_row.get('Scenario', '')
            reasoning = rules or scenario_desc or 'Clinical data validation rule'
            
            # Create pseudo code from the rules
            pseudo_code = f"""# Data validation logic for {child_row.get('Simplified Child Scenario (Plain English)', 'scenario')}
# Based on: {child_row.get('Child_ID', 'N/A')}

def validate_scenario(data):
    \"\"\"
    {reasoning[:200]}...
    \"\"\"
    violations = []
    
    # Check required columns exist
    required_cols = {needed_cols}
    for col in required_cols:
        if col not in data.columns:
            violations.append(f"Missing required column: {{col}}")
            return violations
    
    # Add specific validation logic here
    # {child_row.get('Simplified Child Scenario (Plain English)', 'Validate according to clinical standards')}
    
    return violations
"""
            
            child_scenarios.append({
                "scenario_text": child_row.get('Simplified Child Scenario', ''),
                "required_cdash_items": needed_cols,
                "domains": list(domains),
                "tag": tag,
                "reasoning_template": reasoning[:500] + "..." if len(reasoning) > 500 else reasoning,
                "pseudo_code": pseudo_code
            })
        
        if child_scenarios:  # Only add parent if it has children
            ootb_scenarios.append({
                "name": parent_name,
                "description": f"Clinical data quality scenarios for {domain_combo} domain validation",
                "tag": tag,
                "children": child_scenarios
            })
    
    return ootb_scenarios

if __name__ == "__main__":
    scenarios = process_excel_scenarios()
    
    # Save processed scenarios
    with open('processed_ootb_scenarios.json', 'w') as f:
        json.dump(scenarios, f, indent=2, default=str)
    
    print(f"Processed {len(scenarios)} parent scenarios")
    total_children = sum(len(s['children']) for s in scenarios)
    print(f"Total child scenarios: {total_children}")