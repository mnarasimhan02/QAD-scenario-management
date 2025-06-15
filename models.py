from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
import uuid

@dataclass
class Tag:
    """Represents a scenario tag"""
    name: str
    color: str
    
    @classmethod
    def get_available_tags(cls):
        """Return available tag types with their colors"""
        return [
            cls("Safety", "light text-dark"),
            cls("Efficacy", "light text-dark"),
            cls("Data Quality", "light text-dark"),
            cls("Compliance", "light text-dark"),
            cls("Protocol Deviation", "light text-dark"),
            cls("Other", "light text-dark")
        ]

@dataclass
class ChildScenario:
    """Represents a child scenario"""
    id: str
    scenario_text: str
    required_cdash_items: List[str]
    domains: List[str]
    tag: Optional[Tag]  # Single tag only
    reasoning_template: str
    pseudo_code: str = ""
    version: str = "1.0"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

@dataclass
class ParentScenario:
    """Represents a parent scenario"""
    id: str
    name: str
    description: str
    is_active: bool
    is_ootb: bool  # Out of the Box scenario
    child_scenarios: List[ChildScenario]
    tag: Optional[Tag]  # Single tag only
    version: str = "1.0"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def get_primary_tag(self) -> Optional[Tag]:
        """Get the primary tag for this scenario"""
        return self.tag
    
    def matches_search(self, query: str) -> bool:
        """Check if scenario matches search query"""
        query = query.lower()
        
        # Search in parent fields
        if (query in self.name.lower() or 
            query in self.description.lower()):
            return True
        
        # Search in child scenarios
        for child in self.child_scenarios:
            if (query in child.scenario_text.lower() or
                query in child.reasoning_template.lower() or
                any(query in item.lower() for item in child.required_cdash_items) or
                any(query in domain.lower() for domain in child.domains)):
                return True
        
        # Search in parent tag
        if self.tag and query in self.tag.name.lower():
            return True
            
        # Search in child tags
        for child in self.child_scenarios:
            if child.tag and query in child.tag.name.lower():
                return True
        
        return False
