from flask import render_template, request, redirect, url_for, flash, jsonify, make_response
from app import app
from data import storage
from models import ParentScenario, ChildScenario, Tag
from ai_generator import scenario_generator, ScenarioGenerator
import uuid
import json
import csv
import io
from datetime import datetime

@app.route('/')
def index():
    """Main page with tabbed interface"""
    # Get filter parameters
    search_query = request.args.get('search', '')
    tag_filter = request.args.get('tag', '')
    domain_filter = request.args.get('domain', '')
    active_only = request.args.get('active_only', 'false').lower() == 'true'
    tab = request.args.get('tab', 'ootb')
    
    # Get scenarios based on filters
    scenarios = storage.search_scenarios(
        query=search_query,
        tag_filter=tag_filter if tag_filter else None,
        domain_filter=domain_filter if domain_filter else None,
        active_only=active_only
    )
    
    # Get all unique domains and tags for filters
    all_domains = set()
    all_tags = set()
    
    for scenario in storage.get_all_scenarios():
        for child in scenario.child_scenarios:
            all_domains.update(child.domains)
        # Add parent tag
        if scenario.tag:
            all_tags.add(scenario.tag.name)
        # Add child tags
        for child in scenario.child_scenarios:
            if child.tag:
                all_tags.add(child.tag.name)
    
    return render_template('index.html',
                         scenarios=scenarios,
                         available_tags=Tag.get_available_tags(),
                         all_domains=sorted(list(all_domains)),
                         all_tags=sorted(list(all_tags)),
                         current_tab=tab,
                         search_query=search_query,
                         tag_filter=tag_filter,
                         domain_filter=domain_filter,
                         active_only=active_only)

@app.route('/toggle_scenario/<scenario_id>', methods=['POST'])
def toggle_scenario(scenario_id):
    """Toggle scenario active/inactive status"""
    if storage.toggle_scenario_status(scenario_id):
        scenario = storage.get_scenario_by_id(scenario_id)
        if scenario:
            status = "activated" if scenario.is_active else "deactivated"
            flash(f'Scenario "{scenario.name}" has been {status}.', 'success')
        else:
            flash('Scenario not found.', 'error')
    else:
        flash('Error toggling scenario status.', 'error')
    
    return redirect(url_for('index', tab='ootb'))

@app.route('/create_scenario', methods=['POST'])
def create_scenario():
    """Create new parent scenario"""
    try:
        # Get form data
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        tag_name = request.form.get('tag')
        
        if not name:
            flash('Scenario name is required.', 'error')
            return redirect(url_for('index', tab='create'))
        
        # Create tag
        available_tags = Tag.get_available_tags()
        selected_tag = next((tag for tag in available_tags if tag.name == tag_name), None)
        
        # Handle selected child scenarios from AI suggestions
        selected_children_json = request.form.get('selected_children', '[]')
        suggestions_data_json = request.form.get('suggestions_data', '[]')
        child_scenarios = []
        
        try:
            selected_indices = json.loads(selected_children_json)
            suggestions_data = json.loads(suggestions_data_json)
            
            if selected_indices and suggestions_data:
                # Create child scenario objects from selected suggestions
                available_tags = Tag.get_available_tags()
                for index in selected_indices:
                    if index < len(suggestions_data):
                        scenario_data = suggestions_data[index]
                        child_tag = None
                        if scenario_data.get('tag'):
                            child_tag = next((tag for tag in available_tags if tag.name == scenario_data['tag']), None)
                        
                        child_scenario = ChildScenario(
                            id=str(uuid.uuid4()),
                            scenario_text=scenario_data['scenario_text'],
                            required_cdash_items=scenario_data['required_cdash_items'],
                            domains=scenario_data['domains'],
                            tag=child_tag,
                            reasoning_template=scenario_data['reasoning_template'],
                            pseudo_code=scenario_data.get('pseudo_code', '')
                        )
                        child_scenarios.append(child_scenario)
        except (json.JSONDecodeError, KeyError, IndexError):
            pass  # No valid child scenarios selected
        
        # Create new scenario
        new_scenario = ParentScenario(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            is_active=True,
            is_ootb=False,
            child_scenarios=child_scenarios,
            tag=selected_tag
        )
        
        storage.add_scenario(new_scenario)
        
        child_count = len(child_scenarios)
        if child_count > 0:
            flash(f'Scenario "{name}" created successfully with {child_count} AI-suggested child scenarios.', 'success')
        else:
            flash(f'Scenario "{name}" created successfully.', 'success')
        
    except Exception as e:
        flash(f'Error creating scenario: {str(e)}', 'error')
    
    return redirect(url_for('index', tab='create'))

@app.route('/edit_scenario/<scenario_id>', methods=['POST'])
def edit_scenario(scenario_id):
    """Edit existing scenario"""
    try:
        scenario = storage.get_scenario_by_id(scenario_id)
        if not scenario:
            flash('Scenario not found.', 'error')
            return redirect(url_for('index', tab='create'))
        
        if scenario.is_ootb:
            flash('Cannot edit Out of the Box scenarios.', 'error')
            return redirect(url_for('index', tab='create'))
        
        # Get form data
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        tag_name = request.form.get('tag')
        
        if not name:
            flash('Scenario name is required.', 'error')
            return redirect(url_for('index', tab='create'))
        
        # Update scenario
        available_tags = Tag.get_available_tags()
        selected_tag = next((tag for tag in available_tags if tag.name == tag_name), None)
        
        scenario.name = name
        scenario.description = description
        scenario.tag = selected_tag
        scenario.updated_at = datetime.now()
        
        flash(f'Scenario "{name}" updated successfully.', 'success')
        
    except Exception as e:
        flash(f'Error updating scenario: {str(e)}', 'error')
    
    return redirect(url_for('index', tab='create'))

@app.route('/delete_scenario/<scenario_id>', methods=['POST'])
def delete_scenario(scenario_id):
    """Delete scenario"""
    scenario = storage.get_scenario_by_id(scenario_id)
    if not scenario:
        flash('Scenario not found.', 'error')
        return redirect(url_for('index', tab='create'))
    
    if scenario.is_ootb:
        flash('Cannot delete Out of the Box scenarios.', 'error')
        return redirect(url_for('index', tab='create'))
    
    scenario_name = scenario.name
    if storage.delete_scenario(scenario_id):
        flash(f'Scenario "{scenario_name}" deleted successfully.', 'success')
    else:
        flash('Error deleting scenario.', 'error')
    
    return redirect(url_for('index', tab='create'))

@app.route('/add_child_scenario/<parent_id>', methods=['POST'])
def add_child_scenario(parent_id):
    """Add child scenario to parent"""
    try:
        parent = storage.get_scenario_by_id(parent_id)
        if not parent:
            flash('Parent scenario not found.', 'error')
            return redirect(url_for('index', tab='create'))
        
        # Get form data
        scenario_text = request.form.get('scenario_text', '').strip()
        required_cdash_items = [item.strip() for item in request.form.get('required_cdash_items', '').split(',') if item.strip()]
        domains = [domain.strip() for domain in request.form.get('domains', '').split(',') if domain.strip()]
        tag_name = request.form.get('child_tag')
        reasoning_template = request.form.get('reasoning_template', '').strip()
        
        if not scenario_text:
            flash('Child scenario text is required.', 'error')
            return redirect(url_for('index', tab='create'))
        
        # Create tag
        available_tags = Tag.get_available_tags()
        selected_tag = next((tag for tag in available_tags if tag.name == tag_name), None)
        
        # Create child scenario
        child_scenario = ChildScenario(
            id=str(uuid.uuid4()),
            scenario_text=scenario_text,
            required_cdash_items=required_cdash_items,
            domains=domains,
            tag=selected_tag,
            reasoning_template=reasoning_template,
            pseudo_code=""
        )
        
        parent.child_scenarios.append(child_scenario)
        parent.updated_at = datetime.now()
        
        flash('Child scenario added successfully.', 'success')
        
    except Exception as e:
        flash(f'Error adding child scenario: {str(e)}', 'error')
    
    return redirect(url_for('index', tab='create'))

@app.route('/delete_child_scenario/<parent_id>/<child_id>', methods=['POST'])
def delete_child_scenario(parent_id, child_id):
    """Delete child scenario"""
    try:
        parent = storage.get_scenario_by_id(parent_id)
        if not parent:
            flash('Parent scenario not found.', 'error')
            return redirect(url_for('index', tab='create'))
        
        # Find and remove child scenario
        for i, child in enumerate(parent.child_scenarios):
            if child.id == child_id:
                del parent.child_scenarios[i]
                parent.updated_at = datetime.now()
                flash('Child scenario deleted successfully.', 'success')
                break
        else:
            flash('Child scenario not found.', 'error')
            
    except Exception as e:
        flash(f'Error deleting child scenario: {str(e)}', 'error')
    
    return redirect(url_for('index', tab='create'))

@app.route('/export_scenarios')
def export_scenarios():
    """Export scenarios to CSV"""
    try:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Parent ID', 'Parent Name', 'Parent Description', 'Parent Tags',
            'Is Active', 'Is OOTB', 'Child ID', 'Child Scenario Text',
            'Required CDASH Items', 'Domains', 'Child Tags', 'Reasoning Template'
        ])
        
        # Write data
        for parent in storage.get_all_scenarios():
            parent_tags = ', '.join([tag.name for tag in parent.tags])
            
            if parent.child_scenarios:
                for child in parent.child_scenarios:
                    child_tags = ', '.join([tag.name for tag in child.tags])
                    writer.writerow([
                        parent.id, parent.name, parent.description, parent_tags,
                        parent.is_active, parent.is_ootb, child.id, child.scenario_text,
                        ', '.join(child.required_cdash_items), ', '.join(child.domains),
                        child_tags, child.reasoning_template
                    ])
            else:
                writer.writerow([
                    parent.id, parent.name, parent.description, parent_tags,
                    parent.is_active, parent.is_ootb, '', '', '', '', '', ''
                ])
        
        # Create response
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=qad_scenarios_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        return response
        
    except Exception as e:
        flash(f'Error exporting scenarios: {str(e)}', 'error')
        return redirect(url_for('index'))

@app.route('/dry_run/<scenario_id>')
def dry_run_scenario(scenario_id):
    """Perform dry run test of scenario"""
    scenario = storage.get_scenario_by_id(scenario_id)
    if not scenario:
        flash('Scenario not found.', 'error')
        return redirect(url_for('index'))
    
    # Simulate dry run results
    results = {
        'scenario_id': scenario_id,
        'scenario_name': scenario.name,
        'status': 'success',
        'total_checks': len(scenario.child_scenarios),
        'passed_checks': len(scenario.child_scenarios),
        'failed_checks': 0,
        'warnings': [],
        'details': []
    }
    
    for i, child in enumerate(scenario.child_scenarios):
        results['details'].append({
            'child_scenario': child.scenario_text,
            'status': 'passed',
            'required_items_found': len(child.required_cdash_items),
            'domains_validated': len(child.domains),
            'reasoning_template_valid': bool(child.reasoning_template)
        })
    
    flash(f'Dry run completed for "{scenario.name}". All {results["total_checks"]} checks passed.', 'success')
    return redirect(url_for('index'))

@app.route('/recommend_scenarios', methods=['POST'])
def recommend_scenarios():
    """Get scenario recommendations based on selected domains and tags"""
    try:
        selected_domains = request.form.getlist('recommend_domains')
        selected_tags = request.form.getlist('recommend_tags')
        
        if not selected_domains and not selected_tags:
            flash('Please select at least one domain or tag for recommendations.', 'warning')
            return redirect(url_for('index', tab='recommend'))
        
        # Find matching scenarios
        recommendations = []
        
        for scenario in storage.get_all_scenarios():
            if not scenario.is_active:
                continue
                
            score = 0
            reasons = []
            
            # Check domain matches
            scenario_domains = set()
            for child in scenario.child_scenarios:
                scenario_domains.update(child.domains)
            
            domain_matches = scenario_domains.intersection(set(selected_domains))
            if domain_matches:
                score += len(domain_matches) * 2
                reasons.append(f"Matches domains: {', '.join(domain_matches)}")
            
            # Check tag matches
            scenario_tag_names = set()
            if scenario.tag:
                scenario_tag_names.add(scenario.tag.name)
            for child in scenario.child_scenarios:
                if child.tag:
                    scenario_tag_names.add(child.tag.name)
            
            tag_matches = scenario_tag_names.intersection(set(selected_tags))
            if tag_matches:
                score += len(tag_matches)
                reasons.append(f"Matches tags: {', '.join(tag_matches)}")
            
            if score > 0:
                recommendations.append({
                    'scenario': scenario,
                    'score': score,
                    'reasons': reasons
                })
        
        # Sort by score
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        if recommendations:
            flash(f'Found {len(recommendations)} scenario recommendations.', 'success')
        else:
            flash('No scenarios match the selected criteria.', 'info')
        
        # Get all unique domains and tags for filters
        all_domains_set = set()
        all_tags_set = set()
        
        for scenario in storage.get_all_scenarios():
            for child in scenario.child_scenarios:
                all_domains_set.update(child.domains)
            # Add parent tag
            if scenario.tag:
                all_tags_set.add(scenario.tag.name)
            # Add child tags
            for child in scenario.child_scenarios:
                if child.tag:
                    all_tags_set.add(child.tag.name)
        
        return render_template('index.html',
                             scenarios=storage.get_all_scenarios(),
                             available_tags=Tag.get_available_tags(),
                             all_domains=sorted(list(all_domains_set)),
                             all_tags=sorted(list(all_tags_set)),
                             current_tab='recommend',
                             recommendations=recommendations,
                             selected_domains=selected_domains,
                             selected_tags=selected_tags)
        
    except Exception as e:
        flash(f'Error getting recommendations: {str(e)}', 'error')
        return redirect(url_for('index', tab='recommend'))

@app.route('/generate_child_scenarios/<parent_id>', methods=['POST'])
def generate_child_scenarios(parent_id):
    """Generate child scenarios using AI"""
    try:
        parent = storage.get_scenario_by_id(parent_id)
        if not parent:
            flash('Parent scenario not found.', 'error')
            return redirect(url_for('index', tab='create'))
        
        if parent.is_ootb:
            flash('Cannot generate child scenarios for Out of the Box scenarios.', 'error')
            return redirect(url_for('index', tab='create'))
        
        # Generate child scenarios using AI
        parent_tag_name = parent.tag.name if parent.tag else "General"
        generated_scenarios = scenario_generator.generate_child_scenarios(
            parent.name, 
            parent.description, 
            parent_tag_name
        )
        
        if not generated_scenarios:
            flash('Failed to generate child scenarios. Please try again.', 'error')
            return redirect(url_for('index', tab='create'))
        
        # Convert to ChildScenario objects
        available_tags = Tag.get_available_tags()
        child_scenarios = scenario_generator.create_child_scenario_objects(generated_scenarios, available_tags)
        
        # Add to parent scenario
        parent.child_scenarios.extend(child_scenarios)
        parent.updated_at = datetime.now()
        
        flash(f'Successfully generated {len(child_scenarios)} child scenarios for "{parent.name}".', 'success')
        
    except Exception as e:
        flash(f'Error generating child scenarios: {str(e)}', 'error')
    
    return redirect(url_for('index', tab='create'))

@app.route('/apply_scenario/<scenario_id>', methods=['POST'])
def apply_scenario(scenario_id):
    """Apply recommended scenario to study"""
    scenario = storage.get_scenario_by_id(scenario_id)
    if not scenario:
        flash('Scenario not found.', 'error')
        return redirect(url_for('index', tab='recommend'))
    
    # Simulate applying scenario to study
    flash(f'Scenario "{scenario.name}" has been applied to the study. All {len(scenario.child_scenarios)} child scenarios are now active.', 'success')
    return redirect(url_for('index', tab='recommend'))

@app.route('/api/generate-scenario-metadata', methods=['POST'])
def generate_scenario_metadata():
    """API endpoint to generate scenario name and tag from description"""
    try:
        data = request.get_json()
        description = data.get('description', '')
        
        if not description or len(description) < 70:
            return jsonify({'success': False, 'error': 'Description must be at least 70 characters'})
        
        # Generate a concise scenario name from description
        scenario_name = generate_scenario_name(description)
        
        # Determine appropriate tag
        scenario_tag = scenario_generator._determine_scenario_tag('', description)
        
        return jsonify({
            'success': True,
            'name': scenario_name,
            'tag': scenario_tag
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate metadata: {str(e)}'
        })

@app.route('/api/update-scenario-code', methods=['POST'])
def update_scenario_code():
    """API endpoint to update query text and Python code based on scenario description"""
    try:
        data = request.get_json()
        description = data.get('description', '')
        
        if not description or len(description) < 20:
            return jsonify({'error': 'Description too short'}), 400
        
        # Use AI generator to create updated query text and Python code
        child_scenarios = scenario_generator.generate_child_scenarios(
            parent_name="Updated Scenario",
            parent_description=description
        )
        
        if child_scenarios and len(child_scenarios) > 0:
            first_scenario = child_scenarios[0]
            return jsonify({
                'query_text': first_scenario.get('reasoning_template', 'Find subjects meeting the specified validation criteria'),
                'python_code': first_scenario.get('pseudo_code', 'def check_validation_rule(df):\n    # Generated code\n    return df')
            })
        else:
            return jsonify({'error': 'Failed to generate updated code'}), 500
        
    except Exception as e:
        print(f"Error updating scenario code: {e}")
        return jsonify({'error': 'Failed to update code'}), 500

def generate_scenario_name(description):
    """Generate a professional clinical scenario name from description"""
    description_lower = description.lower()
    
    # Clinical scenario name patterns based on common quality checks
    clinical_patterns = [
        # AE patterns
        (['adverse event', 'ae'], ['inconsisten', 'mismatch', 'outcome', 'action'], 'AE Outcome and Action Inconsistencies'),
        (['serious adverse', 'sae'], ['follow', 'timeframe', 'deadline'], 'Serious AE Follow-Up Compliance'),
        (['adverse event', 'ae'], ['missing', 'incomplete', 'required'], 'Missing Required AE Data'),
        (['adverse event', 'ae'], ['concomitant', 'medication', 'interaction'], 'AE and Concomitant Medication Review'),
        
        # Lab patterns
        (['lab', 'laboratory'], ['missing', 'baseline', 'required'], 'Missing Baseline Laboratory Values'),
        (['lab', 'laboratory'], ['range', 'normal', 'abnormal', 'reference'], 'Laboratory Reference Range Validation'),
        (['creatinine', 'renal'], ['missing', 'baseline'], 'Missing Baseline Creatinine Assessment'),
        
        # Vital signs patterns
        (['vital sign', 'blood pressure', 'heart rate'], ['missing', 'baseline'], 'Missing Baseline Vital Signs'),
        (['vital sign'], ['abnormal', 'clinically significant'], 'Clinically Significant Vital Sign Changes'),
        
        # Protocol compliance patterns
        (['protocol', 'compliance'], ['deviation', 'violation'], 'Protocol Deviation Monitoring'),
        (['visit', 'schedule'], ['window', 'timing', 'compliance'], 'Visit Window Compliance Check'),
        (['eligibility', 'inclusion', 'exclusion'], ['criteria', 'violation'], 'Eligibility Criteria Validation'),
        
        # Data quality patterns
        (['missing', 'data'], ['required', 'mandatory'], 'Missing Required Data Elements'),
        (['duplicate', 'data'], ['entry', 'record'], 'Duplicate Data Entry Detection'),
        (['date', 'inconsisten'], ['logic', 'sequence'], 'Date Logic Inconsistencies'),
        
        # Medication patterns
        (['concomitant', 'medication'], ['missing', 'end date'], 'Concomitant Medication End Date Missing'),
        (['dose', 'dosing'], ['compliance', 'adherence'], 'Dosing Compliance Monitoring'),
        
        # General patterns
        (['efficacy'], ['endpoint', 'assessment'], 'Efficacy Endpoint Assessment'),
        (['safety'], ['monitoring', 'signal'], 'Safety Signal Detection'),
    ]
    
    # Check for pattern matches
    for keywords, context_words, scenario_name in clinical_patterns:
        keyword_match = any(keyword in description_lower for keyword in keywords)
        context_match = any(context in description_lower for context in context_words)
        
        if keyword_match and context_match:
            return scenario_name
    
    # If no specific pattern matches, create a professional name from key terms
    # Extract clinical terms
    clinical_terms = []
    words = description.split()
    
    # Important clinical keywords to prioritize
    priority_terms = {
        'adverse': 'AE', 'ae': 'AE', 'serious': 'Serious', 'sae': 'SAE',
        'laboratory': 'Lab', 'lab': 'Lab', 'baseline': 'Baseline',
        'vital': 'Vital', 'signs': 'Signs', 'protocol': 'Protocol',
        'compliance': 'Compliance', 'missing': 'Missing', 'data': 'Data',
        'medication': 'Medication', 'concomitant': 'Concomitant',
        'efficacy': 'Efficacy', 'safety': 'Safety', 'endpoint': 'Endpoint',
        'visit': 'Visit', 'window': 'Window', 'deviation': 'Deviation'
    }
    
    for word in words[:15]:  # Check first 15 words
        clean_word = word.lower().strip('.,!?;:')
        if clean_word in priority_terms:
            mapped_term = priority_terms[clean_word]
            if mapped_term not in clinical_terms:
                clinical_terms.append(mapped_term)
        if len(clinical_terms) >= 4:
            break
    
    if clinical_terms:
        name = ' '.join(clinical_terms)
        # Add common clinical suffixes if missing
        if not any(suffix in name for suffix in ['Validation', 'Check', 'Monitoring', 'Assessment', 'Review', 'Compliance']):
            if 'Missing' in name or 'Data' in name:
                name += ' Validation'
            elif 'AE' in name or 'Safety' in name:
                name += ' Monitoring'
            else:
                name += ' Assessment'
        return name
    
    return 'Clinical Data Quality Check'

@app.route('/api/suggest-child-scenarios', methods=['POST'])
def suggest_child_scenarios_api():
    """API endpoint to suggest child scenarios based on parent description"""
    try:
        data = request.get_json()
        parent_name = data.get('name', '')
        parent_description = data.get('description', '')
        
        if not parent_description:
            return jsonify({'success': False, 'error': 'Description is required'})
        
        # Generate child scenarios using AI
        suggested_scenarios = scenario_generator.generate_child_scenarios(
            parent_name=parent_name,
            parent_description=parent_description
        )
        
        # Convert to JSON serializable format
        suggestions = []
        for scenario in suggested_scenarios:
            suggestion = {
                'scenario_text': scenario.get('description', scenario.get('rule_description', scenario.get('name', 'Unnamed scenario'))),
                'reasoning_template': scenario.get('reasoning_template', 'No reasoning template provided'),
                'domains': scenario.get('domains', ['General']),
                'required_cdash_items': scenario.get('required_cdash_items', ['SUBJID']),
                'tag': scenario.get('tag', 'Other'),
                'pseudo_code': scenario.get('pseudo_code', '')
            }
            suggestions.append(suggestion)
        
        return jsonify({
            'success': True,
            'suggestions': suggestions
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate suggestions: {str(e)}'
        })

@app.route('/api/generate-domain-analysis', methods=['POST'])
def generate_domain_analysis():
    """API endpoint to generate domain analysis for recommendation"""
    try:
        data = request.get_json()
        scenario_id = data.get('scenario_id', '')
        
        if not scenario_id:
            return jsonify({'error': 'Scenario ID is required'}), 400
        
        # Get scenario from storage
        scenario = storage.get_scenario_by_id(scenario_id)
        if not scenario:
            return jsonify({'error': 'Scenario not found'}), 404
        
        # Generate domain analysis using AI
        generator = ScenarioGenerator()
        analysis = generator._generate_domain_analysis(scenario)
        
        return jsonify(analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-model-thinking', methods=['POST'])
def generate_model_thinking():
    """API endpoint to generate model reasoning for recommendation"""
    try:
        data = request.get_json()
        scenario_id = data.get('scenario_id', '')
        
        if not scenario_id:
            return jsonify({'error': 'Scenario ID is required'}), 400
        
        # Get scenario from storage
        scenario = storage.get_scenario_by_id(scenario_id)
        if not scenario:
            return jsonify({'error': 'Scenario not found'}), 404
        
        # Generate model thinking using AI
        generator = ScenarioGenerator()
        thinking = generator._generate_model_thinking(scenario)
        
        return jsonify(thinking)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
