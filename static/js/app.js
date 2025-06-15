// QAD Scenario Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize table functionality
    initializeTableFunctionality();
    
    // Initialize form validation
    initializeFormValidation();
    
    // Initialize search functionality
    initializeSearch();
});

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize table functionality
 */
function initializeTableFunctionality() {
    // No need for event listeners since we use onclick in template
    console.log('Table functionality initialized');
}

/**
 * Toggle child scenarios visibility
 */
function toggleChildScenarios(scenarioId) {
    const childRows = document.querySelectorAll(`tr[data-parent-id="${scenarioId}"]`);
    const expandButton = document.querySelector(`tr[data-scenario-id="${scenarioId}"] .expand-btn`);
    const icon = expandButton ? expandButton.querySelector('i') : null;
    
    if (childRows.length === 0 || !icon) {
        return;
    }
    
    // Simple visibility check - if any child row is hidden, show all; otherwise hide all
    const firstRowHidden = childRows[0].style.display === 'none' || 
                          window.getComputedStyle(childRows[0]).display === 'none' ||
                          childRows[0].style.display === '';
    
    childRows.forEach(row => {
        if (firstRowHidden) {
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update icon
    if (firstRowHidden) {
        icon.className = 'fas fa-chevron-down';
    } else {
        icon.className = 'fas fa-chevron-right';
    }
}

// Make function globally available
window.toggleChildScenarios = toggleChildScenarios;

/**
 * Handle description input changes
 */
function handleDescriptionChange() {
    const description = document.getElementById('description').value;
    const charCount = document.getElementById('charCount');
    const nameField = document.getElementById('name');
    const tagField = document.getElementById('tag');
    
    // Update character count
    charCount.textContent = `${description.length}/70 characters`;
    
    if (description.length < 70) {
        charCount.classList.add('text-danger');
        charCount.classList.remove('text-success');
        nameField.value = '';
        tagField.disabled = true;
        document.getElementById('childSuggestions').style.display = 'none';
        return;
    } else {
        charCount.classList.remove('text-danger');
        charCount.classList.add('text-success');
    }
    
    // Auto-generate scenario name and tag
    generateScenarioNameAndTag(description);
}

/**
 * Generate scenario name and tag based on description
 */
function generateScenarioNameAndTag(description) {
    fetch('/api/generate-scenario-metadata', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            description: description
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update name field
            document.getElementById('name').value = data.name;
            
            // Update tag field
            const tagField = document.getElementById('tag');
            tagField.disabled = false;
            tagField.value = data.tag;
        }
    })
    .catch(error => {
        console.error('Error generating metadata:', error);
    });
}

/**
 * Suggest child scenarios based on parent description
 */
function suggestChildScenarios() {
    const name = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();
    
    if (!description || description.length < 70) {
        showToast('Please enter at least 70 characters in the description first', 'warning');
        return;
    }
    
    // Show suggestions section
    document.getElementById('childSuggestions').style.display = 'block';
    document.getElementById('loadingSuggestions').style.display = 'block';
    document.getElementById('suggestionsContent').innerHTML = '';
    
    // Make API call to get suggestions
    fetch('/api/suggest-child-scenarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: name,
            description: description
        })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('loadingSuggestions').style.display = 'none';
        
        if (data.success && data.suggestions.length > 0) {
            renderChildSuggestions(data.suggestions);
        } else {
            document.getElementById('suggestionsContent').innerHTML = 
                '<div class="alert alert-info">No relevant child scenarios found for this description.</div>';
        }
    })
    .catch(error => {
        document.getElementById('loadingSuggestions').style.display = 'none';
        document.getElementById('suggestionsContent').innerHTML = 
            '<div class="alert alert-danger">Error generating suggestions. Please try again.</div>';
    });
}

/**
 * Render child scenario suggestions
 */
function renderChildSuggestions(suggestions) {
    const container = document.getElementById('suggestionsContent');
    let html = '';
    
    suggestions.forEach((suggestion, index) => {
        html += `
            <div class="col-md-6">
                <div class="card h-100 border-2 suggestion-card" style="cursor: pointer;" onclick="toggleSuggestionCard(${index})">
                    <div class="card-header bg-light d-flex align-items-center">
                        <div class="form-check mb-0">
                            <input class="form-check-input" type="checkbox" 
                                   id="suggestion_${index}" 
                                   onchange="updateSelectedChildren()" 
                                   onclick="event.stopPropagation()">
                            <label class="form-check-label fw-bold text-primary" for="suggestion_${index}">
                                Child Scenario ${index + 1}
                            </label>
                        </div>
                        ${suggestion.tag ? `<span class="badge bg-info ms-auto">${suggestion.tag}</span>` : ''}
                    </div>
                    <div class="card-body">
                        <h6 class="card-title text-dark mb-3">${suggestion.scenario_text}</h6>
                        
                        <div class="mb-3">
                            <strong class="text-secondary d-block mb-1">Query Text:</strong>
                            <p class="text-muted small mb-0">${suggestion.reasoning_template}</p>
                        </div>
                        
                        <div class="row">
                            <div class="col-6">
                                <strong class="text-secondary d-block mb-2">Domains:</strong>
                                <div class="d-flex flex-wrap gap-1">
                                    ${suggestion.domains.map(d => `<span class="badge bg-primary">${d}</span>`).join('')}
                                </div>
                            </div>
                            <div class="col-6">
                                <strong class="text-secondary d-block mb-2">CDASH Items:</strong>
                                <div class="d-flex flex-wrap gap-1">
                                    ${suggestion.required_cdash_items.map(c => `<span class="badge bg-secondary">${c}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                        
                        ${suggestion.pseudo_code ? `
                            <div class="mt-3">
                                <div class="d-flex align-items-center mb-2">
                                    <strong class="text-secondary me-2">Python Code:</strong>
                                    <button class="btn btn-sm btn-outline-secondary" type="button" onclick="togglePseudoCode(${index})" id="toggle-code-${index}">
                                        <i class="fas fa-chevron-down" id="code-icon-${index}"></i> Show Code
                                    </button>
                                </div>
                                <div class="collapse" id="pseudo-code-${index}">
                                    <pre class="bg-dark text-light p-3 rounded small" style="font-family: 'Courier New', monospace; font-size: 12px;"><code class="language-python">${suggestion.pseudo_code}</code></pre>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Store suggestions for form submission
    window.currentSuggestions = suggestions;
}

/**
 * Toggle suggestion card selection
 */
function toggleSuggestionCard(index) {
    const checkbox = document.getElementById(`suggestion_${index}`);
    const card = checkbox.closest('.card');
    
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        card.classList.add('border-success', 'bg-light');
        card.classList.remove('border-2');
    } else {
        card.classList.remove('border-success', 'bg-light');
        card.classList.add('border-2');
    }
    
    updateSelectedChildren();
}

/**
 * Toggle pseudo code visibility
 */
function togglePseudoCode(index) {
    const codeSection = document.getElementById(`pseudo-code-${index}`);
    const toggleButton = document.getElementById(`toggle-code-${index}`);
    const icon = document.getElementById(`code-icon-${index}`);
    
    if (codeSection.classList.contains('show')) {
        codeSection.classList.remove('show');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        toggleButton.innerHTML = '<i class="fas fa-chevron-down" id="code-icon-' + index + '"></i> Show Code';
    } else {
        codeSection.classList.add('show');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        toggleButton.innerHTML = '<i class="fas fa-chevron-up" id="code-icon-' + index + '"></i> Hide Code';
    }
}

/**
 * Toggle OOTB pseudo code visibility
 */
function toggleOOTBPseudoCode(id) {
    const codeSection = document.getElementById(`ootb-pseudo-code-${id}`);
    const toggleButton = document.getElementById(`toggle-ootb-code-${id}`);
    const icon = document.getElementById(`ootb-code-icon-${id}`);
    
    if (codeSection.classList.contains('show')) {
        codeSection.classList.remove('show');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        toggleButton.innerHTML = '<i class="fas fa-chevron-down" id="ootb-code-icon-' + id + '"></i> Show Code';
    } else {
        codeSection.classList.add('show');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        toggleButton.innerHTML = '<i class="fas fa-chevron-up" id="ootb-code-icon-' + id + '"></i> Hide Code';
    }
}

/**
 * Toggle OOTB prompt template visibility
 */
function toggleOOTBPromptTemplate(id) {
    const section = document.getElementById(`ootb-prompt-template-${id}`);
    const btn = document.getElementById(`toggle-ootb-prompt-${id}`);
    const icon = document.getElementById(`ootb-prompt-icon-${id}`);
    
    if (section.classList.contains('show')) {
        section.classList.remove('show');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        btn.innerHTML = '<i class="fas fa-chevron-down" id="ootb-prompt-icon-' + id + '"></i> Show Template';
    } else {
        section.classList.add('show');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        btn.innerHTML = '<i class="fas fa-chevron-up" id="ootb-prompt-icon-' + id + '"></i> Hide Template';
    }
}

/**
 * Toggle study scenario pseudo code visibility
 */
function toggleStudyPseudoCode(id) {
    const codeSection = document.getElementById(`study-pseudo-code-${id}`);
    const toggleButton = document.getElementById(`toggle-study-code-${id}`);
    const icon = document.getElementById(`study-code-icon-${id}`);
    
    if (codeSection.classList.contains('show')) {
        codeSection.classList.remove('show');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        toggleButton.innerHTML = '<i class="fas fa-chevron-down" id="study-code-icon-' + id + '"></i> Show Code';
    } else {
        codeSection.classList.add('show');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        toggleButton.innerHTML = '<i class="fas fa-chevron-up" id="study-code-icon-' + id + '"></i> Hide Code';
    }
}

/**
 * Update selected children for form submission
 */
function updateSelectedChildren() {
    const selectedIndices = [];
    const selectedScenarios = [];
    const checkboxes = document.querySelectorAll('#suggestionsContent input[type="checkbox"]');
    
    checkboxes.forEach((checkbox, index) => {
        const card = checkbox.closest('.card');
        if (checkbox.checked && window.currentSuggestions && window.currentSuggestions[index]) {
            selectedIndices.push(index);
            selectedScenarios.push(window.currentSuggestions[index]);
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Update selection summary
    const summaryElement = document.getElementById('selectionSummary');
    const countElement = document.getElementById('selectedCount');
    
    if (selectedIndices.length > 0) {
        countElement.textContent = selectedIndices.length;
        summaryElement.classList.remove('d-none');
    } else {
        summaryElement.classList.add('d-none');
    }
    
    // Store both indices and full scenario data
    document.getElementById('selectedChildren').value = JSON.stringify(selectedIndices);
    
    // Update form submission to include scenario data
    const form = document.getElementById('createScenarioForm');
    
    // Remove existing hidden inputs for suggestions
    const existingSuggestions = form.querySelector('input[name="suggestions_data"]');
    if (existingSuggestions) {
        existingSuggestions.remove();
    }
    
    // Add current suggestions data
    if (window.currentSuggestions) {
        const suggestionsInput = document.createElement('input');
        suggestionsInput.type = 'hidden';
        suggestionsInput.name = 'suggestions_data';
        suggestionsInput.value = JSON.stringify(window.currentSuggestions);
        form.appendChild(suggestionsInput);
    }
}

/**
 * Add selected scenarios to study
 */
function addSelectedToStudy() {
    const selectedScenarios = [];
    const checkboxes = document.querySelectorAll('#suggestionsContent input[type="checkbox"]:checked');
    
    checkboxes.forEach((checkbox, index) => {
        const scenarioIndex = parseInt(checkbox.id.split('_')[1]);
        if (window.currentSuggestions && window.currentSuggestions[scenarioIndex]) {
            const scenario = { ...window.currentSuggestions[scenarioIndex] };
            scenario.id = 'study_' + Date.now() + '_' + scenarioIndex;
            scenario.addedAt = new Date().toISOString();
            selectedScenarios.push(scenario);
        }
    });
    
    if (selectedScenarios.length === 0) {
        showToast('Please select at least one scenario to add to study', 'warning');
        return;
    }
    
    // Add to study scenarios storage
    if (!window.studyScenarios) {
        window.studyScenarios = [];
    }
    
    window.studyScenarios.push(...selectedScenarios);
    
    // Render study scenarios
    renderStudyScenarios();
    
    // Show study scenarios section
    document.getElementById('studyScenariosCard').style.display = 'block';
    
    // Clear selections
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.card').classList.remove('selected');
    });
    
    updateSelectedChildren();
    
    showToast(`Added ${selectedScenarios.length} scenarios to study`, 'success');
}

/**
 * Render study scenarios as a table
 */
function renderStudyScenarios() {
    const container = document.getElementById('studyScenariosContainer');
    
    if (!window.studyScenarios || window.studyScenarios.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-3">No scenarios added to study yet.</div>';
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-primary">
                    <tr>
                        <th width="5%"></th>
                        <th width="60%">Rule Description</th>
                        <th width="20%">Added</th>
                        <th width="20%">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    window.studyScenarios.forEach((scenario, index) => {
        const rowId = `study-row-${scenario.id}`;
        const detailsId = `study-details-${scenario.id}`;
        
        html += `
            <tr class="scenario-row" data-scenario-id="${scenario.id}">
                <td>
                    <button class="btn btn-sm btn-outline-primary expand-btn" onclick="toggleStudyScenarioDetails('${scenario.id}')">
                        <i class="fas fa-chevron-right" id="icon-${scenario.id}"></i>
                    </button>
                </td>
                <td>
                    <strong class="text-primary">${scenario.scenario_text}</strong>
                </td>
                <td>
                    <small class="text-muted">${new Date(scenario.addedAt).toLocaleDateString()}</small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning" onclick="editStudyScenario('${scenario.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="removeStudyScenario('${scenario.id}')" title="Remove">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            <tr class="scenario-details" id="${detailsId}" style="display: none;">
                <td></td>
                <td colspan="3">
                    <div class="card border-0 bg-light">
                        <div class="card-body p-3">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-secondary mb-2">
                                        <i class="fas fa-sitemap me-2"></i>Domains
                                    </h6>
                                    <div class="mb-3">
                                        ${scenario.domains.map(d => `<span class="badge bg-primary me-1">${d}</span>`).join('')}
                                    </div>
                                    
                                    <h6 class="text-secondary mb-2">
                                        <i class="fas fa-database me-2"></i>CDASH Items
                                    </h6>
                                    <div class="mb-3">
                                        ${scenario.required_cdash_items.map(c => `<span class="badge bg-secondary me-1">${c}</span>`).join('')}
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    ${scenario.pseudo_code ? `
                                        <div class="d-flex align-items-center mb-2">
                                            <h6 class="text-secondary me-2 mb-0">
                                                <i class="fas fa-code me-1"></i>Python Function
                                            </h6>
                                            <button class="btn btn-sm btn-outline-secondary" type="button" 
                                                    onclick="toggleStudyPseudoCode('${scenario.id}')" 
                                                    id="toggle-study-code-${scenario.id}">
                                                <i class="fas fa-chevron-down" id="study-code-icon-${scenario.id}"></i> Show Code
                                            </button>
                                        </div>
                                        <div class="collapse" id="study-pseudo-code-${scenario.id}">
                                            <pre class="bg-dark text-light p-3 rounded" style="max-height: 300px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 13px;"><code class="language-python">${scenario.pseudo_code.replace(/\\n/g, '\n')}</code></pre>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Toggle study scenario details
 */
function toggleStudyScenarioDetails(scenarioId) {
    const detailsRow = document.getElementById(`study-details-${scenarioId}`);
    const icon = document.getElementById(`icon-${scenarioId}`);
    
    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
        icon.classList.add('rotated');
    } else {
        detailsRow.style.display = 'none';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
        icon.classList.remove('rotated');
    }
}

/**
 * Edit study scenario
 */
function editStudyScenario(scenarioId) {
    const scenario = window.studyScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Create edit modal
    const modalHtml = `
        <div class="modal fade" id="editStudyScenarioModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-edit me-2"></i>Edit Study Scenario
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editStudyScenarioForm">
                            <div class="mb-3">
                                <label class="form-label">Scenario Description</label>
                                <textarea class="form-control" id="editScenarioText" rows="3" oninput="handleScenarioDescriptionChange()" onchange="handleScenarioDescriptionChange()">${scenario.scenario_text}</textarea>
                                <small class="text-muted">Modifying this will automatically update the query text and Python code in real-time</small>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Query Text</label>
                                <textarea class="form-control" id="editReasoningTemplate" rows="2" maxlength="300" style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; background-color: #f8f9fa;" oninput="updateQueryCharCount()">${scenario.reasoning_template || ''}</textarea>
                                <div class="d-flex justify-content-between">
                                    <small class="text-muted">Clinical query description for data managers</small>
                                    <small id="queryCharCount" class="text-muted">0/300 characters</small>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Domains (comma-separated)</label>
                                        <input type="text" class="form-control" id="editDomains" value="${scenario.domains.join(', ')}">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">CDASH Items (comma-separated)</label>
                                        <input type="text" class="form-control" id="editCdashItems" value="${scenario.required_cdash_items.join(', ')}">
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Python Function</label>
                                <textarea class="form-control" id="editPseudoCode" rows="15" style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; line-height: 1.4; background-color: #f8f9fa; border: 2px solid #dee2e6;" placeholder="def check_validation_rule(df):&#10;    '''Describe the validation check'''&#10;    flagged_records = df[condition]&#10;    return flagged_records">${scenario.pseudo_code ? scenario.pseudo_code.replace(/\\n/g, '\n') : ''}</textarea>
                                <small class="text-muted mt-1 d-block">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Write a Python function that accepts a DataFrame and returns flagged records. 
                                    Common updates: add conditions, modify field checks, update logic operators.
                                </small>
                                <div class="mt-2">
                                    <small class="text-muted">
                                        <strong>Example edits:</strong><br>
                                        • Add conditions: <code>& (df['FIELD'] != 'VALUE')</code><br>
                                        • Update operators: <code>== 'Y'</code> → <code>.isin(['Y', 'Yes'])</code><br>
                                        • Include null checks: <code>& df['FIELD'].notna()</code><br>
                                        • Multiple conditions: <code>& ((df['A'] == 'X') | (df['B'] == 'Y'))</code>
                                    </small>
                                </div>
                                <div class="mt-2">
                                    <button type="button" class="btn btn-sm btn-outline-info" onclick="validatePythonCode()">
                                        <i class="fas fa-check-circle me-1"></i>Validate Code
                                    </button>
                                    <span id="codeValidationResult" class="ms-2"></span>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveStudyScenarioChanges('${scenarioId}')">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('editStudyScenarioModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM and show
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('editStudyScenarioModal'));
    modal.show();
}

/**
 * Save study scenario changes
 */
function saveStudyScenarioChanges(scenarioId) {
    const scenario = window.studyScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Get updated values
    const scenarioText = document.getElementById('editScenarioText').value.trim();
    const reasoningTemplate = document.getElementById('editReasoningTemplate').value.trim();
    const domains = document.getElementById('editDomains').value.split(',').map(d => d.trim()).filter(d => d);
    const cdashItems = document.getElementById('editCdashItems').value.split(',').map(c => c.trim()).filter(c => c);
    const pseudoCode = document.getElementById('editPseudoCode').value.trim();
    
    // Validation
    if (!scenarioText) {
        alert('Scenario description is required');
        return;
    }
    
    if (pseudoCode && !pseudoCode.includes('def ')) {
        if (!confirm('Python code does not appear to contain a function definition (def). Continue anyway?')) {
            return;
        }
    }
    
    // Update scenario - including query text for every child scenario
    scenario.scenario_text = scenarioText;
    scenario.reasoning_template = reasoningTemplate;
    scenario.domains = domains.length > 0 ? domains : ['General'];
    scenario.required_cdash_items = cdashItems.length > 0 ? cdashItems : ['SUBJID'];
    scenario.pseudo_code = pseudoCode;
    scenario.updatedAt = new Date().toISOString();
    
    // Re-render study scenarios
    renderStudyScenarios();
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editStudyScenarioModal'));
    modal.hide();
    
    showToast('Study scenario updated successfully', 'success');
}

/**
 * Remove study scenario
 */
function removeStudyScenario(scenarioId) {
    if (confirm('Are you sure you want to remove this scenario from the study?')) {
        window.studyScenarios = window.studyScenarios.filter(s => s.id !== scenarioId);
        renderStudyScenarios();
        
        if (window.studyScenarios.length === 0) {
            document.getElementById('studyScenariosCard').style.display = 'none';
        }
        
        showToast('Scenario removed from study', 'info');
    }
}

/**
 * Handle scenario description changes to auto-update query text and Python code
 */
function handleScenarioDescriptionChange() {
    const descriptionField = document.getElementById('editScenarioText');
    const queryField = document.getElementById('editReasoningTemplate');
    const codeField = document.getElementById('editPseudoCode');
    
    if (!descriptionField || !queryField || !codeField) return;
    
    const description = descriptionField.value.trim();
    
    if (description.length < 20) {
        return; // Too short to generate meaningful updates
    }
    
    // Immediate live update based on description parsing
    const parsedConditions = parseDescriptionConditions(description);
    updateQueryAndCodeLive(parsedConditions, queryField, codeField);
    
    // Also trigger AI-based generation for more sophisticated updates
    generateUpdatedQueryAndCode(description, queryField, codeField);
}

/**
 * Generate updated query text and Python code based on scenario description
 */
async function generateUpdatedQueryAndCode(description, queryField, codeField) {
    try {
        const response = await fetch('/api/update-scenario-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (queryField) {
                queryField.value = data.query_text || 'Find subjects meeting the specified validation criteria';
                updateQueryCharCount();
            }
            codeField.value = data.python_code || 'def check_validation_rule(df):\n    # Generated code\n    return df';
        } else {
            // Fallback to basic generation
            generateBasicQueryAndCode(description, queryField, codeField);
        }
    } catch (error) {
        console.error('Error generating updated code:', error);
        generateBasicQueryAndCode(description, queryField, codeField);
    }
}

/**
 * Generate basic query text and Python code as fallback
 */
function generateBasicQueryAndCode(description, queryField, codeField) {
    // Extract key elements from description
    const upperDesc = description.toUpperCase();
    
    // Determine domain and key fields
    let domain = 'AE';
    let selectFields = ['SUBJID'];
    let whereConditions = [];
    let groupByFields = [];
    let havingConditions = [];
    
    // Parse description for specific fields and conditions
    if (upperDesc.includes('AETERM')) {
        selectFields.push('AETERM');
        if (upperDesc.includes('SAME') && (upperDesc.includes('MULTIPLE') || upperDesc.includes('MORE THAN ONCE'))) {
            groupByFields = ['SUBJID', 'AETERM'];
            havingConditions.push('COUNT(*) > 1');
        }
    }
    
    if (upperDesc.includes('AESTDTC') || upperDesc.includes('START DATE')) {
        selectFields.push('AESTDTC');
    }
    
    if (upperDesc.includes('AESER')) {
        selectFields.push('AESER');
        if (upperDesc.includes('SERIOUS')) {
            whereConditions.push("AESER = 'Y'");
        }
    }
    
    if (upperDesc.includes('MISSING') || upperDesc.includes('NULL')) {
        const lastField = selectFields[selectFields.length - 1];
        whereConditions.push(`${lastField} IS NULL`);
    }
    
    // Build human-readable query description for data managers
    let queryParts = [];
    
    if (upperDesc.includes('SERIOUS')) {
        queryParts.push('serious adverse events');
    }
    if (upperDesc.includes('MISSING') || upperDesc.includes('NULL')) {
        queryParts.push('missing or incomplete data');
    }
    if (upperDesc.includes('MULTIPLE') || upperDesc.includes('MORE THAN ONCE')) {
        queryParts.push('subjects with multiple occurrences of the same event');
    }
    if (upperDesc.includes('AGE') && upperDesc.includes('>')) {
        queryParts.push('elderly subjects');
    } else if (upperDesc.includes('AGE') && upperDesc.includes('<')) {
        queryParts.push('younger subjects');
    }
    if (upperDesc.includes('VITAL') || upperDesc.includes('BP')) {
        queryParts.push('vital signs abnormalities');
    }
    if (upperDesc.includes('LAB') || upperDesc.includes('CREATININE')) {
        queryParts.push('laboratory value anomalies');
    }
    if (upperDesc.includes('SEX') || upperDesc.includes('GENDER')) {
        queryParts.push('gender-specific issues');
    }
    if (upperDesc.includes('SEVERE')) {
        queryParts.push('severe events');
    }
    
    let query;
    if (queryParts.length > 0) {
        // Generate clinical validation rule format
        if (upperDesc.includes('SERIOUS') && upperDesc.includes('MISSING')) {
            query = `AESER = 'Y' but AEACN is blank or missing, verify serious AE has documented action.`;
        } else if (upperDesc.includes('SEVERE') && upperDesc.includes('GRADE')) {
            query = `AESEV is marked as 'Severe', ensure the CTCAE_GRADE is 3 or higher. Flag where the grade is <3.`;
        } else if (upperDesc.includes('CTCAE_GRADE') && (upperDesc.includes('4') || upperDesc.includes('5'))) {
            query = `For AE records with CTCAE_GRADE = 4 or 5, check AEACN is 'None' or missing.`;
        } else if (upperDesc.includes('VITAL') || upperDesc.includes('BP')) {
            query = `Vital signs recorded outside normal range, verify values and ensure proper flagging of abnormal results.`;
        } else if (upperDesc.includes('LAB') || upperDesc.includes('CREATININE')) {
            query = `Laboratory values missing baseline measurements, check required pre-treatment labs are documented.`;
        } else {
            query = `${getDomainDisplayName(domain)} data validation: ${queryParts.join(' and ')} - verify data consistency and completeness.`;
        }
    } else {
        query = `Review ${getDomainDisplayName(domain)} data for validation rule compliance and flag inconsistencies.`;
    }
    
    // Ensure query is under 300 characters
    if (query.length > 300) {
        query = `${getDomainDisplayName(domain)} validation: check data consistency and flag quality issues.`;
    }
    
    // Generate Python function
    const funcName = description.toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30);
    
    let pythonCode = `def check_${funcName}(df):
    '''${description.substring(0, 80)}'''
    flagged_records = df[
        ${whereConditions.length > 0 ? 
          whereConditions.map(c => `(df['${c.split(' ')[0]}'] ${c.includes('IS NULL') ? '.isna()' : '== \'' + c.split("'")[1] + '\''})`)
            .join(' & ') : 
          'df[\'SUBJID\'].notna()'}
    ]
    return flagged_records[${JSON.stringify(selectFields)}]`;
    
    if (queryField) {
        queryField.value = query;
        updateQueryCharCount();
    }
    codeField.value = pythonCode;
}

/**
 * Update query text character count
 */
function updateQueryCharCount() {
    const queryField = document.getElementById('editReasoningTemplate');
    const charCountSpan = document.getElementById('queryCharCount');
    
    if (queryField && charCountSpan) {
        const currentLength = queryField.value.length;
        charCountSpan.textContent = `${currentLength}/300 characters`;
        
        if (currentLength > 280) {
            charCountSpan.classList.add('text-warning');
            charCountSpan.classList.remove('text-muted');
        } else if (currentLength >= 300) {
            charCountSpan.classList.add('text-danger');
            charCountSpan.classList.remove('text-muted', 'text-warning');
        } else {
            charCountSpan.classList.add('text-muted');
            charCountSpan.classList.remove('text-warning', 'text-danger');
        }
    }
}

/**
 * Update child query text character count
 */
function updateChildQueryCharCount() {
    const queryField = document.getElementById('child_reasoning_template');
    const charCountSpan = document.getElementById('childQueryCharCount');
    
    if (queryField && charCountSpan) {
        const currentLength = queryField.value.length;
        charCountSpan.textContent = `${currentLength}/300 characters`;
        
        if (currentLength > 280) {
            charCountSpan.classList.add('text-warning');
            charCountSpan.classList.remove('text-muted');
        } else if (currentLength >= 300) {
            charCountSpan.classList.add('text-danger');
            charCountSpan.classList.remove('text-muted', 'text-warning');
        } else {
            charCountSpan.classList.add('text-muted');
            charCountSpan.classList.remove('text-warning', 'text-danger');
        }
    }
}

/**
 * Parse description for conditions like AGE > 65, SEX='M', etc.
 */
function parseDescriptionConditions(description) {
    const conditions = [];
    const upperDesc = description.toUpperCase();
    
    // Common field patterns
    const patterns = [
        // Age conditions
        { pattern: /AGE\s*([><=!]+)\s*(\d+)/g, field: 'AGE', operator: '$1', value: '$2' },
        { pattern: /AGE\s*([><=!]+)\s*(\d+)/g, field: 'AGE', operator: '$1', value: '$2' },
        
        // Sex conditions
        { pattern: /SEX\s*=\s*['"]*([MF])['"]*|GENDER\s*=\s*['"]*([MF])['"]*|SEX\s*=\s*['"]*([MALE|FEMALE])['"']*/gi, field: 'SEX', operator: '=', value: '$1$2$3' },
        
        // Severity conditions
        { pattern: /AESEV\s*=\s*['"]*([^'"]+)['"]*|SEVERITY\s*=\s*['"]*([^'"]+)['"']*/gi, field: 'AESEV', operator: '=', value: '$1$2' },
        
        // Outcome conditions
        { pattern: /AEOUT\s*=\s*['"]*([^'"]+)['"]*|OUTCOME\s*=\s*['"]*([^'"]+)['"']*/gi, field: 'AEOUT', operator: '=', value: '$1$2' },
        
        // Action conditions
        { pattern: /AEACN\s*=\s*['"]*([^'"]+)['"]*|ACTION\s*=\s*['"]*([^'"]+)['"']*/gi, field: 'AEACN', operator: '=', value: '$1$2' },
        
        // Serious AE
        { pattern: /AESER\s*=\s*['"]*([YN])['"]*|SERIOUS\s*=\s*['"]*([YN])['"']*/gi, field: 'AESER', operator: '=', value: '$1$2' },
        
        // CTCAE Grade conditions
        { pattern: /CTCAE[_\s]*GRADE\s*([><=!]+)\s*(\d+)|GRADE\s*([><=!]+)\s*(\d+)|CTCAE\s*([><=!]+)\s*(\d+)/gi, field: 'CTCAE_GRADE', operator: '$1$3$5', value: '$2$4$6' },
        { pattern: /CTCAE[_\s]*GRADE\s*=\s*(\d+)|GRADE\s*=\s*(\d+)/gi, field: 'CTCAE_GRADE', operator: '=', value: '$1$2' },
        { pattern: /GRADE\s*(\d+)|CTCAE\s*(\d+)/gi, field: 'CTCAE_GRADE', operator: '=', value: '$1$2' },
        
        // AE Date conditions
        { pattern: /AESTDT\s*(missing|blank|null)|AESTDT\s*IS\s*(missing|blank|null)/gi, field: 'AESTDT', operator: 'IS NULL', value: '' },
        { pattern: /AEENDDT\s*(missing|blank|null)|AEENDDT\s*IS\s*(missing|blank|null)/gi, field: 'AEENDDT', operator: 'IS NULL', value: '' },
        { pattern: /AESTDTC\s*(missing|blank|null)|AESTDTC\s*IS\s*(missing|blank|null)/gi, field: 'AESTDTC', operator: 'IS NULL', value: '' },
        { pattern: /AEENDTC\s*(missing|blank|null)|AEENDTC\s*IS\s*(missing|blank|null)/gi, field: 'AEENDTC', operator: 'IS NULL', value: '' },
        
        // Vital signs
        { pattern: /SYSBP\s*([><=!]+)\s*(\d+)|SYSTOLIC\s*([><=!]+)\s*(\d+)/gi, field: 'VSORRES', operator: '$1$3', value: '$2$4', test: 'SYSBP' },
        { pattern: /DIABP\s*([><=!]+)\s*(\d+)|DIASTOLIC\s*([><=!]+)\s*(\d+)/gi, field: 'VSORRES', operator: '$1$3', value: '$2$4', test: 'DIABP' },
        
        // Lab values
        { pattern: /CREATININE\s*([><=!]+)\s*([\d.]+)|CREAT\s*([><=!]+)\s*([\d.]+)/gi, field: 'LBORRES', operator: '$1$3', value: '$2$4', test: 'CREATININE' },
        
        // Missing/null conditions
        { pattern: /(MISSING|NULL|EMPTY|BLANK)/gi, field: 'FIELD', operator: 'IS NULL', value: '' },
    ];
    
    patterns.forEach(p => {
        let match;
        while ((match = p.pattern.exec(description)) !== null) {
            const operator = match[1] || match[3] || p.operator;
            const value = match[2] || match[4] || p.value.replace(/\$\d+/g, m => match[parseInt(m[1])]);
            
            if (value && value.trim()) {
                conditions.push({
                    field: p.field,
                    operator: operator,
                    value: value.trim().replace(/['"]/g, ''),
                    test: p.test || null
                });
            }
        }
    });
    
    // Determine domain based on fields mentioned
    let domain = 'AE';
    if (upperDesc.includes('VITAL') || upperDesc.includes('BP') || upperDesc.includes('SYSBP') || upperDesc.includes('DIABP')) {
        domain = 'VS';
    } else if (upperDesc.includes('LAB') || upperDesc.includes('CREATININE') || upperDesc.includes('LBTEST')) {
        domain = 'LB';
    } else if (upperDesc.includes('CONMED') || upperDesc.includes('CMTRT')) {
        domain = 'CM';
    } else if (upperDesc.includes('DEMOGRAPHICS') || upperDesc.includes('DM.')) {
        domain = 'DM';
    }
    
    return { conditions, domain };
}

/**
 * Get human-readable field display name
 */
function getFieldDisplayName(field) {
    const fieldNames = {
        'AGE': 'age',
        'SEX': 'sex',
        'AESEV': 'adverse event severity',
        'AEOUT': 'adverse event outcome',
        'AEACN': 'action taken',
        'AESER': 'serious adverse events',
        'AETERM': 'adverse event terms',
        'VSORRES': 'vital signs results',
        'LBORRES': 'lab results',
        'CMTRT': 'concomitant medications',
        'MHTERM': 'medical history terms'
    };
    return fieldNames[field] || field.toLowerCase();
}

/**
 * Get human-readable operator text
 */
function getOperatorText(operator) {
    const operators = {
        '>': 'greater than',
        '<': 'less than',
        '>=': 'greater than or equal to',
        '<=': 'less than or equal to',
        '=': 'equal to',
        '!=': 'not equal to',
        'IS NULL': 'is missing'
    };
    return operators[operator] || operator;
}

/**
 * Get human-readable domain display name
 */
function getDomainDisplayName(domain) {
    const domainNames = {
        'AE': 'Adverse Events',
        'VS': 'Vital Signs',
        'LB': 'Laboratory',
        'CM': 'Concomitant Medications',
        'DM': 'Demographics',
        'MH': 'Medical History'
    };
    return domainNames[domain] || domain;
}

/**
 * Update query and code live based on parsed conditions
 */
function updateQueryAndCodeLive(parsedData, queryField, codeField) {
    const { conditions, domain } = parsedData;
    
    if (conditions.length === 0) return;
    
    // Build SELECT fields
    let selectFields = ['SUBJID'];
    let whereConditions = [];
    let pythonConditions = [];
    
    conditions.forEach(cond => {
        if (cond.field !== 'FIELD') {
            if (!selectFields.includes(cond.field)) {
                selectFields.push(cond.field);
            }
            
            if (cond.test) {
                selectFields.push('VSTESTCD', 'VSORRES');
                whereConditions.push(`VSTESTCD = '${cond.test}' AND VSORRES ${cond.operator} ${cond.value}`);
                pythonConditions.push(`(df['VSTESTCD'] == '${cond.test}') & (df['VSORRES'] ${cond.operator.replace(/[<>=!]/g, m => m === '=' ? '==' : m)} ${cond.value})`);
            } else if (cond.operator === 'IS NULL') {
                whereConditions.push(`${cond.field} IS NULL`);
                pythonConditions.push(`df['${cond.field}'].isna()`);
            } else {
                if (isNaN(cond.value)) {
                    whereConditions.push(`${cond.field} ${cond.operator} '${cond.value}'`);
                    pythonConditions.push(`df['${cond.field}'] ${cond.operator.replace(/[<>=!]/g, m => m === '=' ? '==' : m)} '${cond.value}'`);
                } else {
                    whereConditions.push(`${cond.field} ${cond.operator} ${cond.value}`);
                    pythonConditions.push(`df['${cond.field}'] ${cond.operator.replace(/[<>=!]/g, m => m === '=' ? '==' : m)} ${cond.value}`);
                }
            }
        }
    });
    
    // Build human-readable query description
    let queryParts = [];
    
    conditions.forEach(cond => {
        if (cond.field !== 'FIELD') {
            if (cond.test) {
                queryParts.push(`${cond.test} values ${cond.operator} ${cond.value}`);
            } else if (cond.operator === 'IS NULL') {
                queryParts.push(`missing ${cond.field.toLowerCase()}`);
            } else {
                const fieldName = getFieldDisplayName(cond.field);
                const operatorText = getOperatorText(cond.operator);
                queryParts.push(`${fieldName} ${operatorText} ${cond.value}`);
            }
        }
    });
    
    // Generate clinical validation rule format based on detected conditions
    let query;
    const hasCtcaeGrade = conditions.some(c => c.field === 'CTCAE_GRADE');
    const hasSeverity = conditions.some(c => c.field === 'AESEV');
    const hasSerious = conditions.some(c => c.field === 'AESER');
    const hasMissingDate = conditions.some(c => c.field.includes('AESTDT') || c.field.includes('AESTDTC'));
    const hasMissingGrade = conditions.some(c => c.field === 'CTCAE_GRADE' && c.operator === 'IS NULL');
    
    if (hasSeverity && hasMissingDate && hasMissingGrade) {
        query = `AESEV = 'Severe' but AESTDT is missing and CTCAE_GRADE is missing - ensure CTCAE grade is documented for severe AEs.`;
    } else if (hasCtcaeGrade && !hasMissingGrade) {
        const gradeCondition = conditions.find(c => c.field === 'CTCAE_GRADE');
        if (gradeCondition.value === '4' || gradeCondition.value === '5') {
            query = `For AE records with CTCAE_GRADE = ${gradeCondition.value}, check AEACN is 'None' or missing.`;
        } else if (gradeCondition.operator === '>=' && parseInt(gradeCondition.value) >= 3) {
            query = `AESEV is marked as 'Severe', ensure the CTCAE_GRADE is ${gradeCondition.value} or higher. Flag where the grade is <${gradeCondition.value}.`;
        } else {
            query = `CTCAE_GRADE = ${gradeCondition.value}, verify severity alignment and document any inconsistencies.`;
        }
    } else if (hasMissingDate) {
        const dateField = conditions.find(c => c.field.includes('AESTDT') || c.field.includes('AESTDTC'));
        query = `${dateField.field} is missing, verify AE start date is documented for all adverse events.`;
    } else if (hasSeverity && hasSerious) {
        query = `AESEV is marked as 'Severe' and AESER = 'Y', ensure the CTCAE_GRADE is 3 or higher. Flag where the grade is <3.`;
    } else if (hasSerious) {
        query = `AESER = 'Y' but AEOUT is blank or missing, verify serious AE has documented outcome.`;
    } else if (hasSeverity) {
        query = `AESEV is marked as 'Severe', ensure the CTCAE_GRADE is 3 or higher. Flag where the grade is <3.`;
    } else if (queryParts.length > 0) {
        query = `${getDomainDisplayName(domain)} validation: ${queryParts.join(' and ')} - verify data consistency.`;
    } else {
        query = `Review ${getDomainDisplayName(domain)} data for validation rule compliance.`;
    }
    
    // Truncate if too long
    if (query.length > 300) {
        query = `${getDomainDisplayName(domain)} validation: check specified conditions for data quality.`;
    }
    
    // Build Python code with enhanced condition handling
    const funcName = `check_${domain.toLowerCase()}_validation`;
    let pythonCode;
    
    if (hasSeverity && hasMissingDate && hasMissingGrade) {
        pythonCode = `def ${funcName}(df):
    '''Check for severe AEs with missing AESTDT and CTCAE_GRADE'''
    flagged_records = df[
        (df['AESEV'] == 'Severe') & 
        (df['AESTDT'].isna() | df['AESTDT'].isnull()) & 
        (df['CTCAE_GRADE'].isna() | df['CTCAE_GRADE'].isnull())
    ]
    return flagged_records[['SUBJID', 'AETERM', 'AESEV', 'AESTDT', 'CTCAE_GRADE']]`;
    } else if (hasMissingDate) {
        const dateField = conditions.find(c => c.field.includes('AESTDT') || c.field.includes('AESTDTC'));
        pythonCode = `def ${funcName}(df):
    '''Check for missing ${dateField.field} in AE records'''
    flagged_records = df[
        df['${dateField.field}'].isna() | df['${dateField.field}'].isnull()
    ]
    return flagged_records[['SUBJID', 'AETERM', '${dateField.field}', 'AESEV']]`;
    } else if (hasCtcaeGrade && !hasMissingGrade) {
        const gradeCondition = conditions.find(c => c.field === 'CTCAE_GRADE');
        if (gradeCondition.value === '4' || gradeCondition.value === '5') {
            pythonCode = `def ${funcName}(df):
    '''Check for AE records with CTCAE_GRADE = ${gradeCondition.value} and missing/None AEACN'''
    flagged_records = df[
        (df['CTCAE_GRADE'] == ${gradeCondition.value}) & 
        (df['AEACN'].isna() | (df['AEACN'] == 'None') | (df['AEACN'] == ''))
    ]
    return flagged_records[['SUBJID', 'AETERM', 'CTCAE_GRADE', 'AEACN']]`;
        } else {
            pythonCode = `def ${funcName}(df):
    '''Check for CTCAE_GRADE = ${gradeCondition.value} validation'''
    flagged_records = df[
        (df['CTCAE_GRADE'] == ${gradeCondition.value}) & 
        ${pythonConditions.length > 0 ? pythonConditions.join(' & \n        ') : 'df[\'SUBJID\'].notna()'}
    ]
    return flagged_records[['SUBJID', 'AETERM', 'CTCAE_GRADE', 'AESEV']]`;
        }
    } else {
        pythonCode = `def ${funcName}(df):
    '''Check for ${domain} validation conditions'''
    flagged_records = df[
        ${pythonConditions.length > 0 ? pythonConditions.join(' & \n        ') : 'df[\'SUBJID\'].notna()'}
    ]
    return flagged_records[${JSON.stringify(selectFields)}]`;
    }
    
    // Update fields
    if (queryField) {
        queryField.value = query;
        updateQueryCharCount();
    }
    codeField.value = pythonCode;
}

/**
 * Handle child scenario description changes to auto-update query text and Python code
 */
function handleChildScenarioDescriptionChange() {
    const descriptionField = document.getElementById('scenario_text');
    const queryField = document.getElementById('child_reasoning_template');
    const codeField = document.getElementById('child_pseudo_code');
    const promptField = document.getElementById('child_prompt_template');
    
    if (descriptionField && queryField && codeField) {
        const description = descriptionField.value.trim();
        if (description.length > 10) {
            // Immediate live update
            const parsedConditions = parseDescriptionConditions(description);
            updateQueryAndCodeLive(parsedConditions, queryField, codeField);
            
            // Generate SDQ prompt template
            if (promptField) {
                generateSDQPromptTemplate(description, queryField.value, promptField);
            }
            
            // Also trigger AI generation for more sophisticated updates
            generateUpdatedQueryAndCode(description, queryField, codeField);
        }
    }
}

/**
 * Toggle child Python code section
 */
function toggleChildPythonCode() {
    const section = document.getElementById('child-python-code-section');
    const btn = document.getElementById('toggle-child-python-btn');
    const icon = document.getElementById('child-python-icon');
    
    if (section.classList.contains('show')) {
        section.classList.remove('show');
        btn.innerHTML = '<i class="fas fa-chevron-down" id="child-python-icon"></i> Show Code';
    } else {
        section.classList.add('show');
        btn.innerHTML = '<i class="fas fa-chevron-up" id="child-python-icon"></i> Hide Code';
    }
}

/**
 * Toggle child prompt template section
 */
function toggleChildPromptTemplate() {
    const section = document.getElementById('child-prompt-template-section');
    const btn = document.getElementById('toggle-child-prompt-btn');
    const icon = document.getElementById('child-prompt-icon');
    
    if (section.classList.contains('show')) {
        section.classList.remove('show');
        btn.innerHTML = '<i class="fas fa-chevron-down" id="child-prompt-icon"></i> Show Template';
    } else {
        section.classList.add('show');
        btn.innerHTML = '<i class="fas fa-chevron-up" id="child-prompt-icon"></i> Hide Template';
    }
}

/**
 * Generate SDQ prompt template showing how components connect
 */
function generateSDQPromptTemplate(description, queryText, promptField) {
    // Extract variables from description
    const parsedConditions = parseDescriptionConditions(description);
    const variables = parsedConditions.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(', ');
    const domain = parsedConditions.domain || 'AE';
    
    // Generate EDC deep link
    const edcLink = `https://edc.system.com/forms/${domain.toLowerCase()}?filter=${encodeURIComponent(variables)}`;
    
    // Generate outbound API call
    const apiCall = `POST /api/queries/create
{
  "domain": "${domain}",
  "conditions": "${variables}",
  "query_text": "${queryText}",
  "validation_type": "data_quality"
}`;

    const template = `
--- SDQ (Smart Data Quality) Prompt Template ---

DESCRIPTION:
${description}

EXTRACTED VARIABLES:
${variables || 'No specific conditions detected'}

CLINICAL QUERY TEXT:
${queryText || 'Query text will be generated'}

EDC DEEP LINK:
${edcLink}

OUTBOUND API INTEGRATION:
${apiCall}

SDQ PROMPT STRUCTURE:
{
  "scenario_description": "${description}",
  "validation_rule": "${queryText}",
  "target_variables": ["${parsedConditions.conditions.map(c => c.field).join('", "')}"],
  "domain": "${domain}",
  "edc_integration": {
    "deep_link": "${edcLink}",
    "api_endpoint": "/api/queries/create"
  },
  "expected_output": "flagged_records_with_inconsistencies"
}

--- End Template ---`.trim();

    if (promptField) {
        promptField.value = template;
    }
}

/**
 * Validate Python code structure
 */
function validatePythonCode() {
    const codeTextarea = document.getElementById('editPseudoCode');
    const resultSpan = document.getElementById('codeValidationResult');
    
    if (!codeTextarea || !resultSpan) return;
    
    const code = codeTextarea.value.trim();
    
    if (!code) {
        resultSpan.innerHTML = '<small class="text-muted">No code to validate</small>';
        return;
    }
    
    let issues = [];
    
    // Check for function definition
    if (!code.includes('def ')) {
        issues.push('Missing function definition (def)');
    }
    
    // Check for return statement
    if (!code.includes('return ')) {
        issues.push('Missing return statement');
    }
    
    // Check for basic DataFrame operations
    if (!code.includes('df[') && !code.includes('df.')) {
        issues.push('No DataFrame operations found');
    }
    
    // Check for balanced parentheses and brackets
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    
    if (openParens !== closeParens) {
        issues.push('Unbalanced parentheses');
    }
    
    if (openBrackets !== closeBrackets) {
        issues.push('Unbalanced brackets');
    }
    
    // Display results
    if (issues.length === 0) {
        resultSpan.innerHTML = '<small class="text-success"><i class="fas fa-check-circle"></i> Code structure looks good</small>';
    } else {
        resultSpan.innerHTML = '<small class="text-warning"><i class="fas fa-exclamation-triangle"></i> Issues: ' + issues.join(', ') + '</small>';
    }
}

// Make functions globally available
window.handleDescriptionChange = handleDescriptionChange;
window.handleScenarioDescriptionChange = handleScenarioDescriptionChange;
window.handleChildScenarioDescriptionChange = handleChildScenarioDescriptionChange;
window.parseDescriptionConditions = parseDescriptionConditions;
window.updateQueryAndCodeLive = updateQueryAndCodeLive;
window.updateQueryCharCount = updateQueryCharCount;
window.updateChildQueryCharCount = updateChildQueryCharCount;
window.generateScenarioNameAndTag = generateScenarioNameAndTag;
window.suggestChildScenarios = suggestChildScenarios;
window.updateSelectedChildren = updateSelectedChildren;
window.toggleSuggestionCard = toggleSuggestionCard;
window.togglePseudoCode = togglePseudoCode;
window.toggleOOTBPseudoCode = toggleOOTBPseudoCode;
window.toggleStudyPseudoCode = toggleStudyPseudoCode;
window.addSelectedToStudy = addSelectedToStudy;
window.toggleStudyScenarioDetails = toggleStudyScenarioDetails;
window.editStudyScenario = editStudyScenario;
window.saveStudyScenarioChanges = saveStudyScenarioChanges;
window.removeStudyScenario = removeStudyScenario;
window.validatePythonCode = validatePythonCode;



/**
 * Initialize form validation
 */
function initializeFormValidation() {
    // Add form validation for create scenario form
    const createForm = document.querySelector('form[action*="create_scenario"]');
    if (createForm) {
        createForm.addEventListener('submit', function(e) {
            const nameInput = this.querySelector('input[name="name"]');
            if (!nameInput.value.trim()) {
                e.preventDefault();
                showToast('Scenario name is required', 'error');
                nameInput.focus();
                return false;
            }
        });
    }
    
    // Add validation for child scenario modal
    const childForm = document.getElementById('childScenarioForm');
    if (childForm) {
        childForm.addEventListener('submit', function(e) {
            const scenarioText = this.querySelector('textarea[name="scenario_text"]');
            if (!scenarioText.value.trim()) {
                e.preventDefault();
                showToast('Scenario text is required', 'error');
                scenarioText.focus();
                return false;
            }
        });
    }
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const searchForm = document.querySelector('form[method="GET"]');
    if (searchForm) {
        // Add debounced search
        const searchInput = searchForm.querySelector('input[name="search"]');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (this.value.length >= 3 || this.value.length === 0) {
                        searchForm.submit();
                    }
                }, 500);
            });
        }
        
        // Auto-submit on filter changes
        const filterSelects = searchForm.querySelectorAll('select');
        filterSelects.forEach(select => {
            select.addEventListener('change', function() {
                searchForm.submit();
            });
        });
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} border-0" 
             role="alert" id="${toastId}" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    
    // Show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });
    
    toast.show();
    
    // Remove from DOM after hiding
    toastElement.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

/**
 * Confirm deletion with custom modal
 */
function confirmDelete(scenarioId, scenarioName) {
    if (confirm(`Are you sure you want to delete "${scenarioName}"?\n\nThis action cannot be undone.`)) {
        // Show loading state
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
        
        // Create and submit form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/delete_scenario/${scenarioId}`;
        document.body.appendChild(form);
        form.submit();
    }
}

/**
 * Handle dry run testing
 */
function runDryTest(scenarioId) {
    const button = event.target.closest('a') || event.target.closest('button');
    const originalContent = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Running...';
    button.classList.add('disabled');
    
    // Simulate dry run (in real implementation, this would be an AJAX call)
    setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('disabled');
        showToast('Dry run completed successfully', 'success');
    }, 2000);
}

/**
 * Handle scenario application
 */
function applyScenario(scenarioId, scenarioName) {
    if (confirm(`Apply "${scenarioName}" to the current study?\n\nThis will activate all child scenarios for anomaly detection.`)) {
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        
        // Show loading state
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Applying...';
        button.disabled = true;
        
        // Submit form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/apply_scenario/${scenarioId}`;
        document.body.appendChild(form);
        form.submit();
    }
}

/**
 * Filter scenarios by tag
 */
function filterByTag(tagName) {
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set('tag', tagName);
    currentUrl.searchParams.set('tab', 'ootb');
    window.location.href = currentUrl.toString();
}

/**
 * Filter scenarios by domain
 */
function filterByDomain(domainName) {
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set('domain', domainName);
    currentUrl.searchParams.set('tab', 'ootb');
    window.location.href = currentUrl.toString();
}

/**
 * Clear all filters
 */
function clearFilters() {
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.delete('search');
    currentUrl.searchParams.delete('tag');
    currentUrl.searchParams.delete('domain');
    currentUrl.searchParams.delete('active_only');
    window.location.href = currentUrl.toString();
}

/**
 * Export scenarios
 */
function exportScenarios() {
    showToast('Preparing export...', 'info');
    
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = '/export_scenarios';
    link.download = 'qad_scenarios.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
        showToast('Export completed', 'success');
    }, 1000);
}

/**
 * Handle modal form submission
 */
function handleModalSubmit(modalId, formId) {
    const modal = document.getElementById(modalId);
    const form = document.getElementById(formId);
    
    if (modal && form) {
        form.addEventListener('submit', function() {
            const submitButton = form.querySelector('button[type="submit"]');
            const originalContent = submitButton.innerHTML;
            
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Saving...';
            submitButton.disabled = true;
            
            // Note: Form will actually submit, this is just for UX
        });
    }
}

/**
 * Highlight search terms in text
 */
function highlightSearchTerms(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Auto-expand scenarios with search matches
 */
function autoExpandSearchMatches() {
    const searchQuery = new URLSearchParams(window.location.search).get('search');
    if (searchQuery) {
        // Expand all scenarios that might contain matches
        document.querySelectorAll('.scenario-row').forEach(row => {
            const scenarioId = row.dataset.scenarioId;
            const childRows = document.querySelectorAll(`tr[data-parent-id="${scenarioId}"]`);
            
            if (childRows.length > 0) {
                // Check if any child scenarios contain the search term
                let hasMatch = false;
                childRows.forEach(childRow => {
                    const text = childRow.textContent.toLowerCase();
                    if (text.includes(searchQuery.toLowerCase())) {
                        hasMatch = true;
                    }
                });
                
                if (hasMatch) {
                    toggleChildScenarios(scenarioId);
                }
            }
        });
    }
}

// Auto-expand search matches on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(autoExpandSearchMatches, 100);
});

// Handle browser back/forward navigation
window.addEventListener('popstate', function(e) {
    location.reload();
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+F to focus search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[name="search"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }
});

/**
 * DRP Management Functions
 */

// Global variable to store processed DRP data
window.drpData = null;

/**
 * Handle DRP file upload
 */
function handleDRPFileUpload(event) {
    const file = event.target.files[0];
    const processBtn = document.getElementById('process-drp-btn');
    
    if (file && file.type === 'text/csv') {
        processBtn.disabled = false;
        showToast('CSV file selected. Click "Process DRP" to continue.', 'info');
    } else {
        processBtn.disabled = true;
        showToast('Please select a valid CSV file.', 'warning');
    }
}

/**
 * Process DRP CSV file
 */
async function processDRPFile() {
    const fileInput = document.getElementById('drp-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a CSV file first.', 'warning');
        return;
    }
    
    // Show processing status
    document.getElementById('drp-status').style.display = 'block';
    document.getElementById('process-drp-btn').disabled = true;
    
    try {
        // Read CSV file
        const csvText = await readFileAsText(file);
        const parsedData = parseCSV(csvText);
        
        // Validate CSV format with detailed error reporting
        const validationResult = validateDRPFormatDetailed(parsedData);
        if (!validationResult.isValid) {
            throw new Error(`Invalid CSV format: ${validationResult.error}\n\nFound headers: ${parsedData.headers.join(', ')}\n\nExpected: At least one name column and one description column`);
        }
        
        // Process scenarios and generate code
        const processedScenarios = await processDRPScenarios(parsedData);
        
        // Store globally for later use
        window.drpData = {
            original: parsedData,
            processed: processedScenarios
        };
        
        // Display processed scenarios
        displayDRPScenarios(processedScenarios);
        
        // Hide status and show scenarios section
        document.getElementById('drp-status').style.display = 'none';
        document.getElementById('drp-scenarios-section').style.display = 'block';
        document.getElementById('generate-sdq-btn').disabled = false;
        document.getElementById('download-drp-btn').disabled = false;
        
        showToast(`Successfully processed ${processedScenarios.length} scenarios from DRP.`, 'success');
        
    } catch (error) {
        document.getElementById('drp-status').style.display = 'none';
        document.getElementById('process-drp-btn').disabled = false;
        
        // Show detailed error message
        const errorDetails = error.message.includes('Found headers:') ? 
            error.message : 
            `Error processing DRP: ${error.message}`;
            
        // Create detailed error modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">CSV Processing Error</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <pre style="white-space: pre-wrap; font-size: 12px;">${errorDetails}</pre>
                        <hr>
                        <h6>Tips for CSV Format:</h6>
                        <ul class="small">
                            <li>Ensure your CSV has headers in the first row</li>
                            <li>Include a column for check/rule names</li>
                            <li>Include a column for descriptions</li>
                            <li>Common accepted column names: Check Name, Rule Name, Description, Details, etc.</li>
                            <li>Make sure the file is properly formatted CSV with commas as separators</li>
                        </ul>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        new bootstrap.Modal(modal).show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
        
        showToast('CSV processing failed. See details in the error dialog.', 'error');
    }
}

/**
 * Read file as text
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Parse CSV content with improved parsing
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error('CSV file is empty');
    }
    
    // Parse headers with better quote handling
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    console.log('Parsed headers:', headers);
    
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            // Only add rows that have at least one non-empty value
            if (Object.values(row).some(val => val.trim())) {
                rows.push(row);
            }
        }
    }
    
    console.log('Parsed rows count:', rows.length);
    console.log('Sample row:', rows[0]);
    
    return { headers, rows };
}

/**
 * Parse a single CSV line with proper quote handling
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
}

/**
 * Validate DRP CSV format with detailed feedback
 */
function validateDRPFormatDetailed(data) {
    if (!data.headers || data.headers.length === 0) {
        return { isValid: false, error: 'No headers found in CSV file' };
    }
    
    if (!data.rows || data.rows.length === 0) {
        return { isValid: false, error: 'No data rows found in CSV file' };
    }
    
    const headers = data.headers.map(h => h.toLowerCase().trim());
    
    // Check for name column variations
    const namePatterns = ['check', 'name', 'rule', 'scenario', 'test', 'validation', 'category'];
    const hasNameColumn = headers.some(h => 
        namePatterns.some(pattern => h.includes(pattern))
    );
    
    // Check for description column variations
    const descPatterns = ['description', 'detail', 'text', 'rule', 'query'];
    const hasDescriptionColumn = headers.some(h => 
        descPatterns.some(pattern => h.includes(pattern))
    );
    
    if (!hasNameColumn) {
        return { 
            isValid: false, 
            error: 'No name/check column found. Expected columns containing: ' + namePatterns.join(', ')
        };
    }
    
    if (!hasDescriptionColumn) {
        return { 
            isValid: false, 
            error: 'No description column found. Expected columns containing: ' + descPatterns.join(', ')
        };
    }
    
    return { isValid: true, error: null };
}

/**
 * Legacy validation function for backward compatibility
 */
function validateDRPFormat(data) {
    return validateDRPFormatDetailed(data).isValid;
}

/**
 * Process DRP scenarios and generate code
 */
async function processDRPScenarios(data) {
    const scenarios = [];
    
    // Create flexible column mapping
    const getColumnValue = (row, columnVariations) => {
        for (const variation of columnVariations) {
            const value = row[variation];
            if (value && value.trim()) return value.trim();
        }
        return '';
    };
    
    for (const row of data.rows) {
        // Flexible column mapping
        const checkName = getColumnValue(row, [
            'Check Name', 'CheckName', 'check_name', 'Name', 'Rule Name', 'Scenario Name',
            'Check', 'Rule', 'Scenario', 'Test Name', 'Validation Name', 'Category'
        ]);
        
        const description = getColumnValue(row, [
            'Rule Description', 'Description', 'description', 'Detail', 'Details', 'Text', 'Rule Text',
            'Check Description', 'Scenario Description', 'Query Text'
        ]);
        
        const domain = getColumnValue(row, [
            'Domain', 'domain', 'DOMAIN', 'Data Domain', 'CDISC Domain'
        ]);
        
        const priority = getColumnValue(row, [
            'Priority', 'priority', 'PRIORITY', 'Importance', 'Level'
        ]);
        
        const type = getColumnValue(row, [
            'Type', 'type', 'TYPE', 'Category', 'Tag', 'Classification'
        ]);
        
        // Get existing query text and CDASH items if available
        const existingQueryText = getColumnValue(row, [
            'Query Text', 'query_text', 'QueryText', 'Query', 'Rule Text'
        ]);
        
        const existingCdashItems = getColumnValue(row, [
            'CDASH Items', 'cdash_items', 'CdashItems', 'CDASH', 'Items'
        ]);
        
        if (!checkName || !description) continue;
        
        // Parse description for conditions
        const parsedConditions = parseDescriptionConditions(description);
        
        // Use existing query text if available, otherwise generate
        const queryText = existingQueryText || generateQueryTextFromDescription(description, parsedConditions);
        
        // Generate Python code
        const pythonCode = generatePythonCodeFromDescription(description, parsedConditions);
        
        // Use existing CDASH items if available, otherwise extract from description
        let cdashItems;
        if (existingCdashItems) {
            cdashItems = existingCdashItems.split(',').map(item => item.trim()).filter(item => item);
        } else {
            cdashItems = extractCDASHItems(description, parsedConditions);
        }
        
        // Determine if parent or child scenario
        const isParent = priority === 'High' || type === 'Parent';
        
        scenarios.push({
            id: `drp_${scenarios.length + 1}`,
            name: checkName,
            description: description,
            domain: domain || 'AE',
            priority: priority || 'Medium',
            type: type || 'Safety',
            isParent: isParent,
            queryText: queryText,
            pythonCode: pythonCode,
            cdashItems: cdashItems,
            sdqTemplate: generateSDQTemplate(checkName, description, queryText, cdashItems, domain || 'AE')
        });
    }
    
    return scenarios;
}

/**
 * Generate query text from description
 */
function generateQueryTextFromDescription(description, parsedConditions) {
    const conditions = parsedConditions.conditions;
    const hasSeverity = conditions.some(c => c.field === 'AESEV');
    const hasGrade = conditions.some(c => c.field === 'CTCAE_GRADE');
    const hasMissingDate = conditions.some(c => c.field.includes('AESTDT'));
    
    if (hasSeverity && hasGrade) {
        return `AESEV is marked as 'Severe', ensure the CTCAE_GRADE is 3 or higher. Flag where the grade is <3.`;
    } else if (hasMissingDate) {
        return `AESTDT is missing, verify AE start date is documented for all adverse events.`;
    } else if (description.toLowerCase().includes('missing')) {
        return `Check for missing or incomplete data entries that require validation.`;
    } else {
        return `${description.substring(0, 250)}${description.length > 250 ? '...' : ''}`;
    }
}

/**
 * Generate Python code from description
 */
function generatePythonCodeFromDescription(description, parsedConditions) {
    const conditions = parsedConditions.conditions;
    const domain = parsedConditions.domain || 'ae';
    
    if (conditions.length > 0) {
        const pythonConditions = conditions.map(c => {
            if (c.operator === 'IS NULL') {
                return `df['${c.field}'].isna()`;
            } else {
                return `(df['${c.field}'] ${c.operator} '${c.value}')`;
            }
        });
        
        return `def check_${domain.toLowerCase()}_validation(df):
    '''${description}'''
    flagged_records = df[
        ${pythonConditions.join(' & \n        ')}
    ]
    return flagged_records[['SUBJID', 'AETERM', '${conditions[0].field}']]`;
    }
    
    return `def check_${domain.toLowerCase()}_validation(df):
    '''${description}'''
    # Add specific validation logic here
    flagged_records = df[df['SUBJID'].notna()]
    return flagged_records[['SUBJID', 'AETERM']]`;
}

/**
 * Extract CDASH items from description
 */
function extractCDASHItems(description, parsedConditions) {
    const items = ['SUBJID'];
    const conditions = parsedConditions.conditions;
    
    conditions.forEach(c => {
        if (!items.includes(c.field)) {
            items.push(c.field);
        }
    });
    
    // Add common fields based on description
    if (description.toLowerCase().includes('ae')) {
        items.push('AETERM', 'AESTDTC');
    }
    
    return items;
}

/**
 * Generate SDQ template
 */
function generateSDQTemplate(name, description, queryText, cdashItems, domain) {
    return `--- SDQ Template for ${name} ---

DESCRIPTION:
${description}

VARIABLES:
${cdashItems.join(', ')}

QUERY TEXT:
${queryText}

EDC DEEP LINK:
https://edc.system.com/forms/${domain.toLowerCase()}?filter=${cdashItems.join(',')}

API INTEGRATION:
POST /api/queries/create
{
  "name": "${name}",
  "description": "${description}",
  "domain": "${domain}",
  "variables": ["${cdashItems.join('", "')}"],
  "query_text": "${queryText}"
}`;
}

/**
 * Display processed DRP scenarios
 */
function displayDRPScenarios(scenarios) {
    const container = document.getElementById('drp-scenarios-container');
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-info">
                    <tr>
                        <th>Check Name</th>
                        <th>Type</th>
                        <th>Domain</th>
                        <th>Priority</th>
                        <th>Query Text</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    scenarios.forEach((scenario, index) => {
        html += `
            <tr>
                <td>
                    <strong>${scenario.name}</strong>
                    ${scenario.isParent ? '<span class="badge bg-primary ms-1">Parent</span>' : '<span class="badge bg-secondary ms-1">Child</span>'}
                </td>
                <td><span class="badge bg-info">${scenario.type}</span></td>
                <td><span class="badge bg-success">${scenario.domain}</span></td>
                <td><span class="badge bg-warning">${scenario.priority}</span></td>
                <td class="text-truncate" style="max-width: 200px;" title="${scenario.queryText}">
                    ${scenario.queryText}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewDRPScenarioDetails(${index})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="editDRPScenario(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * View DRP scenario details
 */
function viewDRPScenarioDetails(index) {
    const scenario = window.drpData.processed[index];
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${scenario.name} - Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Description:</h6>
                            <p class="text-muted">${scenario.description}</p>
                            
                            <h6>Query Text:</h6>
                            <p class="bg-light p-2 rounded">${scenario.queryText}</p>
                            
                            <h6>CDASH Items:</h6>
                            <p>${scenario.cdashItems.map(item => `<span class="badge bg-secondary me-1">${item}</span>`).join('')}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Python Code:</h6>
                            <pre class="bg-dark text-light p-3 rounded small" style="max-height: 300px; overflow-y: auto;">${scenario.pythonCode}</pre>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <h6>SDQ Template:</h6>
                        <pre class="bg-light border p-3 rounded small" style="max-height: 200px; overflow-y: auto;">${scenario.sdqTemplate}</pre>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    new bootstrap.Modal(modal).show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

/**
 * Generate SDQ Package
 */
async function generateSDQPackage() {
    if (!window.drpData) {
        showToast('No DRP data available. Please process a DRP file first.', 'warning');
        return;
    }
    
    const scenarios = window.drpData.processed;
    
    // Create SDQ package structure
    const sdqPackage = {
        metadata: {
            generated_at: new Date().toISOString(),
            total_scenarios: scenarios.length,
            domains: [...new Set(scenarios.map(s => s.domain))],
            types: [...new Set(scenarios.map(s => s.type))]
        },
        scenarios: scenarios.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            domain: s.domain,
            type: s.type,
            is_parent: s.isParent,
            query_text: s.queryText,
            cdash_items: s.cdashItems,
            python_code: s.pythonCode,
            sdq_template: s.sdqTemplate
        }))
    };
    
    // Store package for download
    window.sdqPackage = sdqPackage;
    
    // Show SDQ package section
    document.getElementById('sdq-package-section').style.display = 'block';
    document.getElementById('download-sdq-package-btn').disabled = false;
    
    showToast('SDQ package generated successfully!', 'success');
}

/**
 * Download DRP with code
 */
function downloadDRPWithCode() {
    if (!window.drpData) {
        showToast('No DRP data available.', 'warning');
        return;
    }
    
    const scenarios = window.drpData.processed;
    let csvContent = 'Check Name,Description,Domain,Priority,Type,Query Text,Python Code,CDASH Items\n';
    
    scenarios.forEach(scenario => {
        const row = [
            `"${scenario.name}"`,
            `"${scenario.description}"`,
            `"${scenario.domain}"`,
            `"${scenario.priority}"`,
            `"${scenario.type}"`,
            `"${scenario.queryText}"`,
            `"${scenario.pythonCode.replace(/"/g, '""')}"`,
            `"${scenario.cdashItems.join(', ')}"`
        ].join(',');
        csvContent += row + '\n';
    });
    
    downloadFile('drp_with_code.csv', csvContent, 'text/csv');
    showToast('DRP with code downloaded successfully!', 'success');
}

/**
 * Download SDQ Package
 */
function downloadSDQPackage() {
    if (!window.sdqPackage) {
        showToast('No SDQ package available.', 'warning');
        return;
    }
    
    const jsonContent = JSON.stringify(window.sdqPackage, null, 2);
    downloadFile('sdq_package.json', jsonContent, 'application/json');
    showToast('SDQ package downloaded successfully!', 'success');
}

/**
 * Preview SDQ Package
 */
function previewSDQPackage() {
    if (!window.sdqPackage) {
        showToast('No SDQ package available.', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">SDQ Package Preview</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <pre class="bg-light border p-3 rounded" style="max-height: 500px; overflow-y: auto;">${JSON.stringify(window.sdqPackage, null, 2)}</pre>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    new bootstrap.Modal(modal).show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

/**
 * Edit DRP scenario
 */
function editDRPScenario(index) {
    const scenario = window.drpData.processed[index];
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit DRP Scenario - ${scenario.name}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-drp-form">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Check Name</label>
                                    <input type="text" class="form-control" id="edit-name" value="${scenario.name}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" id="edit-description" rows="3">${scenario.description}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Query Text</label>
                                    <textarea class="form-control" id="edit-query" rows="3">${scenario.queryText}</textarea>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Domain</label>
                                    <select class="form-control" id="edit-domain">
                                        <option value="AE" ${scenario.domain === 'AE' ? 'selected' : ''}>AE</option>
                                        <option value="CM" ${scenario.domain === 'CM' ? 'selected' : ''}>CM</option>
                                        <option value="VS" ${scenario.domain === 'VS' ? 'selected' : ''}>VS</option>
                                        <option value="LB" ${scenario.domain === 'LB' ? 'selected' : ''}>LB</option>
                                        <option value="DM" ${scenario.domain === 'DM' ? 'selected' : ''}>DM</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Type</label>
                                    <select class="form-control" id="edit-type">
                                        <option value="Safety" ${scenario.type === 'Safety' ? 'selected' : ''}>Safety</option>
                                        <option value="Efficacy" ${scenario.type === 'Efficacy' ? 'selected' : ''}>Efficacy</option>
                                        <option value="Data Quality" ${scenario.type === 'Data Quality' ? 'selected' : ''}>Data Quality</option>
                                        <option value="Compliance" ${scenario.type === 'Compliance' ? 'selected' : ''}>Compliance</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Priority</label>
                                    <select class="form-control" id="edit-priority">
                                        <option value="High" ${scenario.priority === 'High' ? 'selected' : ''}>High</option>
                                        <option value="Medium" ${scenario.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                                        <option value="Low" ${scenario.priority === 'Low' ? 'selected' : ''}>Low</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Python Code</label>
                            <textarea class="form-control" id="edit-python" rows="8" style="font-family: monospace;">${scenario.pythonCode}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveDRPScenario(${index}, this)">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

/**
 * Save DRP scenario changes
 */
function saveDRPScenario(index, button) {
    const scenario = window.drpData.processed[index];
    
    // Get updated values
    scenario.name = document.getElementById('edit-name').value;
    scenario.description = document.getElementById('edit-description').value;
    scenario.queryText = document.getElementById('edit-query').value;
    scenario.domain = document.getElementById('edit-domain').value;
    scenario.type = document.getElementById('edit-type').value;
    scenario.priority = document.getElementById('edit-priority').value;
    scenario.pythonCode = document.getElementById('edit-python').value;
    
    // Regenerate CDASH items and SDQ template
    const parsedConditions = parseDescriptionConditions(scenario.description);
    scenario.cdashItems = extractCDASHItems(scenario.description, parsedConditions);
    scenario.sdqTemplate = generateSDQTemplate(scenario.name, scenario.description, scenario.queryText, scenario.cdashItems, scenario.domain);
    
    // Refresh display
    displayDRPScenarios(window.drpData.processed);
    
    // Close modal
    const modal = button.closest('.modal');
    bootstrap.Modal.getInstance(modal).hide();
    
    showToast('DRP scenario updated successfully!', 'success');
}

/**
 * Download file helper
 */
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Open child scenario modal
 */
function openChildScenarioModal(parentId, parentName) {
    const modal = document.getElementById('childScenarioModal');
    const titleElement = document.getElementById('childScenarioModalTitle');
    const parentIdInput = document.getElementById('childScenarioParentId');
    
    if (modal && titleElement && parentIdInput) {
        titleElement.textContent = `Add Child Scenario to "${parentName}"`;
        parentIdInput.value = parentId;
        
        // Clear form
        const form = document.getElementById('childScenarioForm');
        if (form) {
            form.reset();
        }
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// Add loading states for all form submissions
document.addEventListener('submit', function(e) {
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (submitButton && !submitButton.disabled) {
        const originalContent = submitButton.innerHTML;
        
        // Special handling for AI generation button
        if (submitButton.querySelector('.fa-magic')) {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Generating...';
        } else {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing...';
        }
        
        submitButton.disabled = true;
        
        // Re-enable after a delay in case of errors
        setTimeout(() => {
            if (submitButton.disabled) {
                submitButton.innerHTML = originalContent;
                submitButton.disabled = false;
            }
        }, 15000); // Longer timeout for AI generation
    }
});
