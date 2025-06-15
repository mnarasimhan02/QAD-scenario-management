from models import ParentScenario, ChildScenario, Tag
from datetime import datetime
import uuid
import json

class ScenarioStorage:
    """In-memory storage for scenarios"""
    
    def __init__(self):
        self.scenarios = []
        self._initialize_ootb_scenarios()
    
    def _initialize_ootb_scenarios(self):
        """Initialize Out of the Box scenarios from Excel data"""
        available_tags = Tag.get_available_tags()
        tag_map = {tag.name: tag for tag in available_tags}
        
        # Load authentic scenarios from processed Excel data
        try:
            with open('processed_ootb_scenarios.json', 'r') as f:
                raw_scenarios = json.load(f)
        except FileNotFoundError:
            print("Error: Excel scenario data not found")
            raw_scenarios = []
        
        # Convert raw data to proper format
        ootb_scenarios = []
        for scenario_data in raw_scenarios:
            # Parse tag from string representation
            tag_str = scenario_data.get("tag", "")
            if "Safety" in tag_str:
                tag = tag_map["Safety"]
            elif "Compliance" in tag_str:
                tag = tag_map["Compliance"]
            elif "Data Quality" in tag_str:
                tag = tag_map["Data Quality"]
            elif "Efficacy" in tag_str:
                tag = tag_map["Efficacy"]
            elif "Protocol Deviation" in tag_str:
                tag = tag_map["Protocol Deviation"]
            else:
                tag = tag_map["Other"]
            
            # Process children
            children = []
            for child_data in scenario_data.get("children", []):
                # Parse child tag
                child_tag_str = child_data.get("tag", "")
                if "Safety" in child_tag_str:
                    child_tag = tag_map["Safety"]
                elif "Compliance" in child_tag_str:
                    child_tag = tag_map["Compliance"]
                elif "Data Quality" in child_tag_str:
                    child_tag = tag_map["Data Quality"]
                elif "Efficacy" in child_tag_str:
                    child_tag = tag_map["Efficacy"]
                elif "Protocol Deviation" in child_tag_str:
                    child_tag = tag_map["Protocol Deviation"]
                else:
                    child_tag = tag_map["Other"]
                
                children.append({
                    "scenario_text": child_data.get("scenario_text", ""),
                    "required_cdash_items": child_data.get("required_cdash_items", []),
                    "domains": child_data.get("domains", []),
                    "tag": child_tag,
                    "reasoning_template": child_data.get("reasoning_template", ""),
                    "pseudo_code": child_data.get("pseudo_code", "")
                })
            
            ootb_scenarios.append({
                "name": scenario_data.get("name", ""),
                "description": scenario_data.get("description", ""),
                "tag": tag,
                "children": children
            })
        
        # Convert to ParentScenario objects
        for scenario_data in ootb_scenarios:
            child_scenarios = []
            for child_data in scenario_data["children"]:
                child = ChildScenario(
                    id=str(uuid.uuid4()),
                    scenario_text=child_data["scenario_text"],
                    required_cdash_items=child_data["required_cdash_items"],
                    domains=child_data["domains"],
                    tag=child_data["tag"],
                    reasoning_template=child_data["reasoning_template"],
                    pseudo_code=child_data.get("pseudo_code", "")
                )
                child_scenarios.append(child)
            
            parent = ParentScenario(
                id=str(uuid.uuid4()),
                name=scenario_data["name"],
                description=scenario_data["description"],
                is_active=True,
                is_ootb=True,
                child_scenarios=child_scenarios,
                tag=scenario_data["tag"]
            )
            self.scenarios.append(parent)
    
    def get_all_scenarios(self):
        """Get all scenarios"""
        return self.scenarios
    
    def get_scenario_by_id(self, scenario_id):
        """Get scenario by ID"""
        for scenario in self.scenarios:
            if scenario.id == scenario_id:
                return scenario
        return None
    
    def add_scenario(self, scenario):
        """Add new scenario"""
        self.scenarios.append(scenario)
    
    def update_scenario(self, scenario_id, updated_scenario):
        """Update existing scenario"""
        for i, scenario in enumerate(self.scenarios):
            if scenario.id == scenario_id:
                updated_scenario.updated_at = datetime.now()
                self.scenarios[i] = updated_scenario
                return True
        return False
    
    def delete_scenario(self, scenario_id):
        """Delete scenario (only if not OOTB)"""
        for i, scenario in enumerate(self.scenarios):
            if scenario.id == scenario_id and not scenario.is_ootb:
                del self.scenarios[i]
                return True
        return False
    
    def toggle_scenario_status(self, scenario_id):
        """Toggle scenario active/inactive status"""
        scenario = self.get_scenario_by_id(scenario_id)
        if scenario:
            scenario.is_active = not scenario.is_active
            scenario.updated_at = datetime.now()
            return True
        return False
    
    def search_scenarios(self, query, tag_filter=None, domain_filter=None, active_only=False):
        """Search scenarios with filters"""
        results = []
        
        for scenario in self.scenarios:
            # Apply active filter
            if active_only and not scenario.is_active:
                continue
            
            # Apply search query
            if query and not scenario.matches_search(query):
                continue
            
            # Apply tag filter
            if tag_filter:
                scenario_has_tag = False
                # Check parent tag
                if scenario.tag and scenario.tag.name == tag_filter:
                    scenario_has_tag = True
                # Check child tags
                for child in scenario.child_scenarios:
                    if child.tag and child.tag.name == tag_filter:
                        scenario_has_tag = True
                        break
                if not scenario_has_tag:
                    continue
            
            # Apply domain filter
            if domain_filter:
                scenario_domains = []
                for child in scenario.child_scenarios:
                    scenario_domains.extend(child.domains)
                if domain_filter not in scenario_domains:
                    continue
            
            results.append(scenario)
        
        return results

# Global storage instance
storage = ScenarioStorage()
