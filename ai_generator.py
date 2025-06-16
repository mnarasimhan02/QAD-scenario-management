import json
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from models import ChildScenario, Tag
import uuid

class ScenarioGenerator:
    """AI-powered scenario generator using OpenAI"""
    
    def __init__(self):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = OpenAI(api_key=api_key)
    
    def _determine_scenario_tag(self, parent_name: str, parent_description: str) -> str:
        """Determine the most appropriate tag based on parent scenario content"""
        combined_text = f"{parent_name} {parent_description}".lower()
        
        # Safety indicators
        safety_keywords = ['adverse', 'ae', 'sae', 'safety', 'serious', 'fatal', 'death', 'drug interaction', 
                          'vital sign', 'blood pressure', 'heart rate', 'temperature', 'allergic', 'reaction']
        
        # Efficacy indicators  
        efficacy_keywords = ['efficacy', 'endpoint', 'primary outcome', 'secondary outcome', 'response', 
                           'treatment effect', 'improvement', 'progression', 'tumor', 'survival']
        
        # Data Quality indicators
        data_quality_keywords = ['missing', 'incomplete', 'data entry', 'format', 'validation', 'duplicate', 
                               'consistency', 'completeness', 'accuracy', 'range check']
        
        # Compliance indicators
        compliance_keywords = ['compliance', 'adherence', 'protocol', 'inclusion', 'exclusion', 'eligibility',
                             'visit window', 'dosing', 'medication compliance']
        
        # Protocol Deviation indicators
        protocol_deviation_keywords = ['deviation', 'violation', 'visit schedule', 'procedure', 'consent',
                                     'randomization', 'enrollment', 'withdrawal']
        
        # Count matches for each category
        safety_score = sum(1 for keyword in safety_keywords if keyword in combined_text)
        efficacy_score = sum(1 for keyword in efficacy_keywords if keyword in combined_text)
        data_quality_score = sum(1 for keyword in data_quality_keywords if keyword in combined_text)
        compliance_score = sum(1 for keyword in compliance_keywords if keyword in combined_text)
        protocol_deviation_score = sum(1 for keyword in protocol_deviation_keywords if keyword in combined_text)
        
        # Determine the highest scoring category
        scores = {
            'Safety': safety_score,
            'Efficacy': efficacy_score,
            'Data Quality': data_quality_score,
            'Compliance': compliance_score,
            'Protocol Deviation': protocol_deviation_score
        }
        
        # Return the tag with highest score, default to 'Other' if no clear match
        max_score = max(scores.values())
        if max_score == 0:
            return 'Other'
        
        # Find the tag with the highest score
        for tag, score in scores.items():
            if score == max_score:
                return tag
        
        return 'Other'
    
    def generate_child_scenarios(self, parent_name: str, parent_description: str, parent_tag: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate child scenarios based on parent scenario information"""
        
        # Combine parent name and description for the prompt
        parent_scenario_text = f"{parent_name}: {parent_description}"
        
        # Determine the most appropriate tag based on parent scenario content
        determined_tag = self._determine_scenario_tag(parent_name, parent_description)
        
        prompt = f"""
        You are a clinical data quality expert creating specific edit check rules. Generate 5 very specific child scenarios for this parent scenario:
        
        Parent: {parent_name}
        Description: {parent_description}
        
        Based on the parent scenario content, the primary tag category should be: {determined_tag}
        
        Each child scenario must be a precise edit check rule with exact conditions, like these examples:
        
        For "AE Outcome and Action Inconsistencies":
        1. "AE led to drug withdrawal, but outcome still marked as Not Recovered" - Rule: When AEACN = 'DRUG WITHDRAWN' but AEOUT != 'RECOVERED/RESOLVED'
        2. "SAE marked but no action taken on drug" - Rule: When AESER = 'Y' but AEACN is missing or = 'NONE'
        3. "Fatal outcome but drug continuation indicated" - Rule: When AEOUT = 'FATAL' but AEACN = 'DRUG CONTINUED'
        
        For "Missing Required Lab Values":
        1. "Missing baseline creatinine for renal impairment subjects" - Rule: When MHTERM contains 'RENAL' but baseline LBTEST = 'Creatinine' is missing
        2. "Missing liver function tests with hepatotoxic drugs" - Rule: When CMTRT contains hepatotoxic medication but ALT/AST baseline missing
        
        Each rule should:
        - Be very specific with exact field values and conditions
        - Reference actual CDISC CDASH variable names (AEACN, AEOUT, AESER, AESTDTC, LBTEST, LBORRES, etc.)
        - State the logical condition clearly (when X = 'VALUE' but Y != 'EXPECTED')
        - Focus on realistic clinical data validation scenarios
        - Include a complete Python function that implements the validation logic
        - Function should accept a DataFrame parameter and return flagged records
        - Use descriptive function names like check_ae_outcome_inconsistency() or validate_missing_baseline_labs()
        - Generate human-readable clinical query descriptions that explain what data managers should look for
        
        Use these CDISC domains and variables:
        - AE: AETERM, AESTDTC, AEENDTC, AEOUT, AEACN, AESER, AESEV, AEREL
        - CM: CMTRT, CMSTDTC, CMENDTC, CMINDC, CMDOSE, CMROUTE
        - VS: VSTESTCD, VSORRES, VSORRESU, VISIT, VSDTC
        - LB: LBTEST, LBORRES, LBORRESU, LBNRIND, VISIT, LBDTC
        - DM: AGE, SEX, RACE, ACTARM, RFSTDTC, RFENDTC
        - MH: MHTERM, MHSTDTC, MHENDTC, MHPRESP
        
        IMPORTANT: All child scenarios should use the tag "{determined_tag}" as determined from the parent scenario content.
        Only use a different tag if a specific child scenario clearly belongs to a different category:
        - "Safety" - For adverse events, SAEs, safety monitoring, drug interactions, vital signs abnormalities
        - "Efficacy" - For treatment response, efficacy endpoints, primary/secondary outcomes
        - "Data Quality" - For missing data, data completeness, data entry errors, format validation
        - "Compliance" - For protocol adherence, visit windows, inclusion/exclusion criteria
        - "Protocol Deviation" - For visit scheduling violations, procedure deviations, consent issues
        - "Other" - For general administrative or miscellaneous checks

        Respond with valid JSON in this exact format:
        {{
            "child_scenarios": [
                {{
                    "name": "Specific Rule Name",
                    "description": "Rule: When [FIELD1] = 'VALUE1' but [FIELD2] = 'VALUE2' - detailed condition description",
                    "required_cdash_items": ["AEACN", "AEOUT", "SUBJID"],
                    "domains": ["AE"],
                    "tag": "Safety",
                    "reasoning_template": "AESEV is marked as 'Severe', ensure the CTCAE_GRADE is 3 or higher. Flag where the grade is <3.",
                    "pseudo_code": "def check_ae_outcome_action_inconsistency(ae_df):\\n    '''Check for AE outcome and action inconsistencies'''\\n    flagged_records = ae_df[\\n        (ae_df['AEACN'] == 'DRUG WITHDRAWN') & \\n        (ae_df['AEOUT'] != 'RECOVERED')\\n    ]\\n    return flagged_records[['SUBJID', 'AETERM', 'AEACN', 'AEOUT']]"
                }}
            ]
        }}
        
        IMPORTANT: The reasoning_template should be a concise clinical validation rule (MAX 300 characters) that describes the data quality check. Use this format:
        - "AESEV is marked as 'Severe', ensure the CTCAE_GRADE is 3 or higher. Flag where the grade is <3."
        - "For AE records with CTCAE_GRADE = 4 or 5, check AEACN is 'None' or missing."
        - "AESER = 'Y' but AEOUT is blank or missing, verify serious AE has documented outcome."
        
        Keep descriptions under 300 characters and focus on the clinical significance of the validation rule.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert clinical data quality assurance specialist. Generate realistic, implementable quality checks based on CDISC standards. Always respond with valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=2000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            if content:
                result = json.loads(content)
                return result.get("child_scenarios", [])
            return []
            
        except Exception as e:
            print(f"Error generating scenarios: {e}")
            return self._get_fallback_scenarios(parent_name, parent_description)
    
    def _get_fallback_scenarios(self, parent_name: str, parent_description: str) -> List[Dict[str, Any]]:
        """Fallback scenarios if AI generation fails"""
        return [
            {
                "name": f"Basic {parent_name} Check",
                "rule_description": f"Performs basic validation checks related to {parent_description.lower()}",
                "required_cdash_items": ["SUBJID", "VISIT"],
                "domains": ["DM"],
                "tag": "Data Quality",
                "reasoning_template": "Basic validation failed for subject {SUBJID} at visit {VISIT}"
            }
        ]
    
    def create_child_scenario_objects(self, generated_scenarios: List[Dict[str, Any]], available_tags: List[Tag]) -> List[ChildScenario]:
        """Convert generated scenario data to ChildScenario objects"""
        child_scenarios = []
        
        for scenario_data in generated_scenarios:
            # Find matching tag
            tag_name = scenario_data.get("tag", "Other")
            selected_tag = next((tag for tag in available_tags if tag.name == tag_name), available_tags[-1])  # Default to "Other"
            
            child = ChildScenario(
                id=str(uuid.uuid4()),
                scenario_text=scenario_data.get("description", scenario_data.get("rule_description", "")),
                required_cdash_items=scenario_data.get("required_cdash_items", []),
                domains=scenario_data.get("domains", []),
                tag=selected_tag,
                reasoning_template=scenario_data.get("reasoning_template", ""),
                pseudo_code=scenario_data.get("pseudo_code", "")
            )
            child_scenarios.append(child)
        
        return child_scenarios

    def _generate_domain_analysis(self, scenario) -> Dict[str, Any]:
        """Generate domain data analysis for scenario recommendation"""
        # Initialize default values
        domains = set()
        cdash_fields = set()
        
        try:
            # Collect domain information from scenario
            for child in scenario.child_scenarios:
                domains.update(child.domains)
                cdash_fields.update(child.required_cdash_items)
            
            domains_list = list(domains) if domains else ["DM", "AE", "EX"]
            
            prompt = f"""
            Analyze the clinical scenario "{scenario.name}" for domain data patterns and risk assessment.
            
            Scenario Description: {scenario.description}
            Domains Involved: {', '.join(domains_list)}
            CDASH Fields: {', '.join(cdash_fields)}
            Child Scenarios: {len(scenario.child_scenarios)}
            
            Provide analysis in JSON format:
            {{
                "patterns": ["pattern1", "pattern2", "pattern3"],
                "domains": ["domain1", "domain2"],
                "risk_level": "High|Medium|Low",
                "risk_explanation": "explanation of risk assessment"
            }}
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a clinical data analysis expert. Analyze scenarios for data patterns and risk assessment."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            if content:
                result = json.loads(content)
                return result
            else:
                raise Exception("No content returned from AI")
            
        except Exception as e:
            print(f"Error generating domain analysis: {e}")
            domains_list = list(domains) if domains else ["DM", "AE", "EX"]
            return {
                "patterns": [
                    "Cross-domain data consistency checks",
                    "Safety signal validation patterns",
                    "Regulatory compliance verification"
                ],
                "domains": domains_list,
                "risk_level": "Medium",
                "risk_explanation": "Standard clinical data validation scenario with moderate complexity"
            }

    def _generate_model_thinking(self, scenario) -> Dict[str, Any]:
        """Generate AI model reasoning for scenario recommendation"""
        try:
            # Collect scenario information
            domains = set()
            for child in scenario.child_scenarios:
                domains.update(child.domains)
            
            prompt = f"""
            Explain the AI reasoning for recommending the clinical scenario "{scenario.name}".
            
            Scenario: {scenario.name}
            Description: {scenario.description}
            Tag: {scenario.tag.name if scenario.tag else 'Not specified'}
            Domains: {', '.join(domains)}
            Number of Child Scenarios: {len(scenario.child_scenarios)}
            
            Provide reasoning in JSON format:
            {{
                "selection_reasoning": "why this scenario was recommended",
                "priority_logic": "explanation of priority assessment",
                "implementation_steps": ["step1", "step2", "step3"]
            }}
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an AI clinical scenario recommendation expert. Explain your reasoning for scenario selection."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=500
            )
            
            content = response.choices[0].message.content or ""
            result = json.loads(content)
            return result
            
        except Exception as e:
            print(f"Error generating model thinking: {e}")
            return {
                "selection_reasoning": "Selected based on high relevance to specified clinical domains and comprehensive data validation coverage",
                "priority_logic": "Prioritized due to critical safety implications and regulatory compliance requirements",
                "implementation_steps": [
                    "Review scenario specifications and requirements",
                    "Configure data validation rules and thresholds",
                    "Test scenario against sample clinical data",
                    "Deploy to production environment with monitoring"
                ]
            }

# Global generator instance
scenario_generator = ScenarioGenerator()