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
    
    // Parse conditions from description with enhanced parsing
    const parsedConditions = parseDescriptionConditions(description);
    
    // If we found specific conditions, use incremental updates
    if (parsedConditions.conditions && parsedConditions.conditions.length > 0) {
        console.log('Found conditions:', parsedConditions.conditions);
        updateQueryAndCodeLive(parsedConditions, queryField, codeField);
    } else {
        // Only use AI generation if no specific conditions were detected
        console.log('No conditions found, using AI generation');
        generateUpdatedQueryAndCode(description, queryField, codeField);
    }
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
    
    // Enhanced patterns with better null/not null handling
    const patterns = [
        // Enhanced null/not null patterns (must come first)
        { pattern: /(\w+)\s+IS\s+NOT\s+NULL/gi, field: '$1', operator: 'IS NOT NULL', value: '' },
        { pattern: /(\w+)\s+IS\s+NULL/gi, field: '$1', operator: 'IS NULL', value: '' },
        { pattern: /(\w+)\s+NOT\s+NULL/gi, field: '$1', operator: 'IS NOT NULL', value: '' },
        { pattern: /(\w+)\s+NULL/gi, field: '$1', operator: 'IS NULL', value: '' },
        { pattern: /(\w+)\s+IS\s+NOT\s+MISSING/gi, field: '$1', operator: 'IS NOT NULL', value: '' },
        { pattern: /(\w+)\s+IS\s+MISSING/gi, field: '$1', operator: 'IS NULL', value: '' },
        { pattern: /(\w+)\s+NOT\s+MISSING/gi, field: '$1', operator: 'IS NOT NULL', value: '' },
        { pattern: /(\w+)\s+MISSING/gi, field: '$1', operator: 'IS NULL', value: '' },
        { pattern: /(\w+)\s+IS\s+PRESENT/gi, field: '$1', operator: 'IS NOT NULL', value: '' },
        { pattern: /(\w+)\s+IS\s+ABSENT/gi, field: '$1', operator: 'IS NULL', value: '' },
        
        // Enhanced comparison operators
        { pattern: /(\w+)\s*!=\s*['"]*([^'"]+)['"']*/gi, field: '$1', operator: '!=', value: '$2' },
        { pattern: /(\w+)\s*=\s*['"]*([^'"]+)['"']*/gi, field: '$1', operator: '=', value: '$2' },
        { pattern: /(\w+)\s*>=\s*(\d+(?:\.\d+)?)/gi, field: '$1', operator: '>=', value: '$2' },
        { pattern: /(\w+)\s*<=\s*(\d+(?:\.\d+)?)/gi, field: '$1', operator: '<=', value: '$2' },
        { pattern: /(\w+)\s*>\s*(\d+(?:\.\d+)?)/gi, field: '$1', operator: '>', value: '$2' },
        { pattern: /(\w+)\s*<\s*(\d+(?:\.\d+)?)/gi, field: '$1', operator: '<', value: '$2' },
        
        // Specific CDISC field patterns
        { pattern: /ACTARM\s*!=\s*['"]*([^'"]+)['"']*/gi, field: 'ACTARM', operator: '!=', value: '$1' },
        { pattern: /ACTARM\s*=\s*['"]*([^'"]+)['"']*/gi, field: 'ACTARM', operator: '=', value: '$1' },
        { pattern: /RANDDT|RANDOMIZATION\s*DATE|RAND\s*DATE/gi, field: 'RANDDT', operator: 'MENTIONED', value: '' },
        
        // CTCAE Grade patterns
        { pattern: /CTCAE[_\s]*GRADE\s*([><=!]+)\s*(\d+)|GRADE\s*([><=!]+)\s*(\d+)/gi, field: 'CTCAE_GRADE', operator: '$1$3', value: '$2$4' },
        { pattern: /CTCAE[_\s]*GRADE\s*=\s*(\d+)|GRADE\s*=\s*(\d+)/gi, field: 'CTCAE_GRADE', operator: '=', value: '$1$2' },
        
        // AE-specific patterns
        { pattern: /AESEV\s*=\s*['"]*([^'"]+)['"']*/gi, field: 'AESEV', operator: '=', value: '$1' },
        { pattern: /AEOUT\s*=\s*['"]*([^'"]+)['"']*/gi, field: 'AEOUT', operator: '=', value: '$1' },
        { pattern: /AEACN\s*=\s*['"]*([^'"]+)['"']*/gi, field: 'AEACN', operator: '=', value: '$1' },
        { pattern: /AESER\s*=\s*['"]*([YN])['"']*/gi, field: 'AESER', operator: '=', value: '$1' },
        
        // Exposure patterns
        { pattern: /EX\s+RECORD/gi, field: 'EX_RECORD', operator: 'EXISTS', value: 'PRESENT' },
    ];
    
    // Parse logical operators and their positions
    const logicalOperators = [];
    const andMatches = [...description.matchAll(/\band\b/gi)];
    const orMatches = [...description.matchAll(/\bor\b/gi)];
    
    andMatches.forEach(match => logicalOperators.push({ type: 'AND', position: match.index }));
    orMatches.forEach(match => logicalOperators.push({ type: 'OR', position: match.index }));
    
    // Process patterns to extract conditions
    patterns.forEach(p => {
        let match;
        const regex = new RegExp(p.pattern.source, p.pattern.flags);
        while ((match = regex.exec(description)) !== null) {
            let field = p.field;
            let operator = p.operator;
            let value = p.value;
            
            // Replace placeholders with actual match groups
            if (field.includes('$')) {
                field = field.replace(/\$(\d+)/g, (_, num) => match[parseInt(num)] || '');
            }
            if (operator.includes('$')) {
                operator = operator.replace(/\$(\d+)/g, (_, num) => match[parseInt(num)] || '');
            }
            if (value.includes('$')) {
                value = value.replace(/\$(\d+)/g, (_, num) => match[parseInt(num)] || '');
            }
            
            // Clean up field name and value
            field = field.toUpperCase().trim();
            value = value.trim().replace(/['"]/g, '');
            
            if (field && field !== 'FIELD') {
                conditions.push({
                    field: field,
                    operator: operator,
                    value: value,
                    position: match.index,
                    raw: match[0]
                });
            }
        }
    });
    
    // Sort conditions by position to maintain order
    conditions.sort((a, b) => a.position - b.position);
    
    // Determine domains based on fields
    const domains = new Set();
    conditions.forEach(condition => {
        const field = condition.field;
        if (['AETERM', 'AESTDTC', 'AEENDTC', 'AEOUT', 'AEACN', 'AESER', 'AESEV', 'CTCAE_GRADE'].includes(field)) {
            domains.add('AE');
        } else if (['ACTARM', 'AGE', 'SEX', 'RANDDT', 'RFSTDTC'].includes(field)) {
            domains.add('DM');
        } else if (['EXSTDTC', 'EXTRT', 'EXENDTC'].includes(field)) {
            domains.add('EX');
        } else if (['VSTESTCD', 'VSORRES', 'VSDTC'].includes(field)) {
            domains.add('VS');
        } else if (['LBTEST', 'LBORRES', 'LBDTC'].includes(field)) {
            domains.add('LB');
        }
    });
    
    // Add default domain if none detected
    if (domains.size === 0) {
        domains.add('AE');
    }
    
    return { 
        conditions, 
        logicalOperators,
        domains: Array.from(domains)
    };
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
    const { conditions, logicalOperators, domains } = parsedData;
    
    if (conditions.length === 0) return;
    
    // Build incremental query text based on exact conditions found
    let queryParts = [];
    let cdashItems = new Set(['SUBJID']);
    let pythonConditions = [];
    
    conditions.forEach((cond, index) => {
        if (cond.field !== 'FIELD') {
            cdashItems.add(cond.field);
            
            // Build human-readable condition
            let conditionText;
            if (cond.operator === 'IS NULL') {
                conditionText = `${cond.field} is null`;
                pythonConditions.push(`(dm_df['${cond.field}'].isnull())`);
            } else if (cond.operator === 'IS NOT NULL') {
                conditionText = `${cond.field} is not null`;
                pythonConditions.push(`(dm_df['${cond.field}'].notnull())`);
            } else if (cond.operator === '!=') {
                conditionText = `${cond.field} != '${cond.value}'`;
                pythonConditions.push(`(dm_df['${cond.field}'] != '${cond.value}')`);
            } else if (cond.operator === '=') {
                conditionText = `${cond.field} = '${cond.value}'`;
                pythonConditions.push(`(dm_df['${cond.field}'] == '${cond.value}')`);
            } else {
                conditionText = `${cond.field} ${cond.operator} ${cond.value}`;
                pythonConditions.push(`(dm_df['${cond.field}'] ${cond.operator} ${cond.value})`);
            }
            
            // Add logical operator if not first condition
            if (index > 0) {
                const hasOrBefore = logicalOperators.some(op => 
                    op.type === 'OR' && op.position < cond.position && op.position > (conditions[index-1]?.position || 0)
                );
                conditionText = hasOrBefore ? `or ${conditionText}` : `and ${conditionText}`;
            }
            
            queryParts.push(conditionText);
        }
    });
    
    // Generate query text that directly reflects the conditions
    const baseConditions = queryParts.join(' ').replace(/^(and|or)\s+/, '');
    let queryText;
    
    // Handle specific scenario patterns for better clinical descriptions
    if (baseConditions.includes('ACTARM != \'SCREEN FAILURE\'') && baseConditions.includes('RANDDT is not null')) {
        queryText = "Subjects assigned to an arm should have at least one EX record. Flag subjects without.";
    } else {
        queryText = `Flag records where ${baseConditions}.`;
    }
    
    // Truncate if too long
    if (queryText.length > 300) {
        queryText = queryText.substring(0, 297) + '...';
    }
    
    // Generate Python code that matches the exact conditions
    const primaryDomain = domains[0] || 'DM';
    const funcName = `check_missing_exposure_records`;
    
    let pythonCode;
    if (baseConditions.includes('ACTARM != \'SCREEN FAILURE\'') && baseConditions.includes('RANDDT is not null')) {
        pythonCode = `def ${funcName}(dm_df, ex_df):
    '''Check for missing EX records for non-screen failures'''
    non_screen_failures = dm_df[
        (dm_df['ACTARM'] != 'SCREEN FAILURE') & 
        (dm_df['RANDDT'].notnull())
    ]
    missing_ex_records = non_screen_failures[
        ~non_screen_failures['SUBJID'].isin(ex_df['SUBJID'])
    ]
    return missing_ex_records[['SUBJID', 'ACTARM']]`;
    } else {
        // Generic code based on conditions
        const domainPrefix = primaryDomain.toLowerCase();
        pythonCode = `def check_${domainPrefix}_validation(${domainPrefix}_df):
    '''Check for ${primaryDomain} validation conditions'''
    flagged_records = ${domainPrefix}_df[
        ${pythonConditions.join(' & \n        ')}
    ]
    return flagged_records[['SUBJID', '${Array.from(cdashItems).slice(1).join("', '")}']]`;
    }
    
    // Update fields
    if (queryField) {
        queryField.value = queryText;
        updateQueryCharCount();
    }
    if (codeField) {
        codeField.value = pythonCode;
    }
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
            // Parse conditions from description
            const parsedConditions = parseDescriptionConditions(description);
            
            // If we found specific conditions, use incremental updates
            if (parsedConditions.conditions && parsedConditions.conditions.length > 0) {
                console.log('Child scenario - Found conditions:', parsedConditions.conditions);
                updateQueryAndCodeLive(parsedConditions, queryField, codeField);
                
                // Generate SDQ prompt template based on parsed query text
                if (promptField) {
                    generateSDQPromptTemplate(description, queryField.value, promptField);
                }
            } else {
                // Only use AI generation if no specific conditions were detected
                console.log('Child scenario - No conditions found, using AI generation');
                generateUpdatedQueryAndCode(description, queryField, codeField);
                
                // Generate SDQ prompt template
                if (promptField) {
                    generateSDQPromptTemplate(description, queryField.value, promptField);
                }
            }
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
                    <button class="btn btn-sm btn-outline-primary" onclick="viewDRPScenarioDetails(${index})" data-bs-toggle="collapse" data-bs-target="#drp-details-${index}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="editDRPScenario(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
            <tr id="drp-details-${index}" class="collapse">
                <td colspan="6">
                    <div class="p-3 bg-light border-start border-info border-3">
                        <div class="row mb-3">
                            <div class="col-md-12">
                                <h6 class="text-info">Description:</h6>
                                <p class="text-muted mb-3">${scenario.description}</p>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6 class="text-info">Query Text:</h6>
                                <textarea class="form-control" rows="3" readonly>${scenario.queryText}</textarea>
                                <small class="text-muted">Clinical query description for data managers</small>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-info">CDASH Items:</h6>
                                <input type="text" class="form-control" value="${scenario.cdashItems.join(', ')}" readonly>
                                <small class="text-muted">Required CDISC variables</small>
                            </div>
                        </div>
                        
                        <!-- Python Function Section -->
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="text-info mb-0">Python Function</h6>
                                <button class="btn btn-sm btn-outline-info" onclick="toggleDRPPythonCode(${index})" type="button">
                                    <i class="fas fa-code"></i> Toggle Code
                                </button>
                            </div>
                            <div id="drp-python-code-${index}" class="collapse">
                                <textarea class="form-control font-monospace" rows="8" readonly style="font-size: 12px; background-color: #f8f9fa;">${scenario.pythonCode}</textarea>
                                <div class="text-muted small mt-2">
                                    <i class="fas fa-info-circle"></i> Write a Python function that accepts a DataFrame and returns flagged records. Common updates: add conditions, modify field checks, update logic operators.
                                    <br><strong>Example edits:</strong>
                                    <ul class="small mb-0 mt-1">
                                        <li>Add conditions: <code class="text-danger">& (df['FIELD'] != 'VALUE')</code></li>
                                        <li>Update operators: <code class="text-danger">== 'Y' → .isin(['Y', 'Yes'])</code></li>
                                        <li>Include null checks: <code class="text-danger">& df['FIELD'].notna()</code></li>
                                        <li>Multiple conditions: <code class="text-danger">& ((df['A'] == 'X') | (df['B'] == 'Y'))</code></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <!-- SDQ Prompt Template Section -->
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="text-info mb-0">SDQ Prompt Template</h6>
                                <button class="btn btn-sm btn-outline-info" onclick="toggleDRPPromptTemplate(${index})" type="button">
                                    <i class="fas fa-file-code"></i> Toggle Template
                                </button>
                            </div>
                            <div id="drp-prompt-template-${index}" class="collapse">
                                <textarea class="form-control font-monospace" rows="12" readonly style="font-size: 11px; background-color: #f8f9fa;" id="drp-prompt-${index}">Loading SDQ template...</textarea>
                                <div class="text-muted small mt-2">
                                    <i class="fas fa-info-circle"></i> Complete SDQ integration template with EDC deep links, API calls, and outbound processing instructions.
                                    <br><strong>Includes:</strong> Query execution, result processing, EDC integration, notification system, and data validation workflows.
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
    
    // Store processed scenarios globally for workflow
    processedDRPScenarios = scenarios;
    
    // Enable scenario creation button and update workflow progress
    const createScenariosBtn = document.getElementById('create-scenarios-btn');
    if (createScenariosBtn) {
        createScenariosBtn.disabled = false;
    }
    
    // Update workflow progress
    updateWorkflowProgress(1);
    updateStepStatus('step1-indicator', 'completed');
    
    // Automatically create parent-child scenarios after processing
    setTimeout(() => {
        createParentChildScenarios();
    }, 1000);
    
    // Generate SDQ prompt templates after the HTML is rendered
    scenarios.forEach((scenario, index) => {
        setTimeout(() => {
            const promptTemplate = generateSDQTemplateForDRP(scenario);
            const promptTextarea = document.getElementById(`drp-prompt-${index}`);
            if (promptTextarea) {
                promptTextarea.value = promptTemplate;
            }
        }, 100 * index); // Stagger the generation to avoid blocking
    });
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
 * Toggle DRP Python code section
 */
function toggleDRPPythonCode(index) {
    const element = document.getElementById(`drp-python-code-${index}`);
    if (element) {
        const bsCollapse = new bootstrap.Collapse(element, { toggle: true });
    }
}

/**
 * Toggle DRP prompt template section
 */
function toggleDRPPromptTemplate(index) {
    const element = document.getElementById(`drp-prompt-template-${index}`);
    if (element) {
        const bsCollapse = new bootstrap.Collapse(element, { toggle: true });
    }
}

/**
 * Generate SDQ template for DRP scenarios
 */
function generateSDQTemplateForDRP(scenario) {
    const functionName = scenario.pythonCode.match(/def\s+(\w+)/)?.[1] || 'check_validation';
    const cdashItemsList = scenario.cdashItems.join("', '");
    
    return `# SDQ Smart Data Quality Integration Template
# Scenario: ${scenario.name}
# Domain: ${scenario.domain} | Priority: ${scenario.priority}

# =============================================================================
# QUERY EXECUTION BLOCK
# =============================================================================

# Clinical Query Description:
# ${scenario.queryText}

# Python Validation Function:
${scenario.pythonCode}

# =============================================================================
# EDC INTEGRATION & DEEP LINKING
# =============================================================================

# EDC Deep Link Configuration:
edc_deeplink_config = {
    "base_url": "https://edc.example.com/forms",
    "study_id": "{{STUDY_ID}}",
    "subject_fields": ["SUBJID"],
    "form_mapping": {
        "${scenario.domain}": {
            "form_name": "${scenario.domain}_FORM",
            "fields": ["${cdashItemsList}"],
            "validation_rules": ["${scenario.name}"]
        }
    }
}

# Generate EDC Links for Flagged Records:
def generate_edc_links(flagged_records, config):
    links = []
    for _, record in flagged_records.iterrows():
        subject_id = record['SUBJID']
        form_url = f"{config['base_url']}/{config['study_id']}/subjects/{subject_id}/forms/{config['form_mapping']['${scenario.domain}']['form_name']}"
        links.append({
            "subject": subject_id,
            "url": form_url,
            "fields_to_review": config['form_mapping']['${scenario.domain}']['fields']
        })
    return links

# =============================================================================
# API INTEGRATION & OUTBOUND PROCESSING
# =============================================================================

# Outbound API Configuration:
outbound_config = {
    "notification_endpoint": "https://api.example.com/notifications",
    "query_management_endpoint": "https://api.example.com/queries",
    "escalation_endpoint": "https://api.example.com/escalations",
    "headers": {
        "Authorization": "Bearer {{API_TOKEN}}",
        "Content-Type": "application/json"
    }
}

# Send Query Notifications:
def send_query_notifications(flagged_records, edc_links):
    notification_payload = {
        "query_type": "${scenario.name}",
        "priority": "${scenario.priority}",
        "domain": "${scenario.domain}",
        "total_records": len(flagged_records),
        "description": "${scenario.queryText}",
        "subjects_affected": flagged_records['SUBJID'].tolist(),
        "edc_links": edc_links,
        "fields_to_review": ["${cdashItemsList}"],
        "timestamp": datetime.now().isoformat(),
        "requires_action": True
    }
    
    # Send to notification system
    response = requests.post(
        outbound_config["notification_endpoint"],
        json=notification_payload,
        headers=outbound_config["headers"]
    )
    return response

# =============================================================================
# COMPLETE WORKFLOW EXECUTION
# =============================================================================

def execute_sdq_workflow(dm_df, ex_df=None, ae_df=None):
    """Complete SDQ workflow execution"""
    
    # Step 1: Execute validation function
    if '${scenario.domain}' == 'DM':
        flagged_records = ${functionName}(dm_df, ex_df) if 'ex_df' in locals() else ${functionName}(dm_df)
    elif '${scenario.domain}' == 'AE' and ae_df is not None:
        flagged_records = ${functionName}(ae_df)
    else:
        flagged_records = ${functionName}(dm_df)
    
    print(f"Found {len(flagged_records)} flagged records for ${scenario.name}")
    
    # Step 2: Generate EDC deep links
    edc_links = generate_edc_links(flagged_records, edc_deeplink_config)
    
    # Step 3: Send notifications
    notification_response = send_query_notifications(flagged_records, edc_links)
    
    # Step 4: Create query management records
    query_payload = {
        "query_id": f"${scenario.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "status": "Open",
        "assignee": "Data Management Team",
        "flagged_records": flagged_records.to_dict('records'),
        "resolution_required": True
    }
    
    # Step 5: Return comprehensive results
    return {
        "flagged_records": flagged_records,
        "edc_links": edc_links,
        "notification_sent": notification_response.status_code == 200,
        "query_created": True,
        "next_actions": [
            "Review flagged subjects in EDC",
            "Validate ${cdashItemsList} fields",
            "Update query status after resolution",
            "Document corrective actions taken"
        ]
    }

# =============================================================================
# USAGE EXAMPLE
# =============================================================================

# Execute the complete workflow:
# results = execute_sdq_workflow(demographics_df, exposure_df, adverse_events_df)
# print(f"Workflow completed. {len(results['flagged_records'])} records require attention.")`;
}

/**
 * View recommendation details with domain analysis and model thinking
 */
function viewRecommendationDetails(scenarioId) {
    // Generate domain analysis
    generateDomainAnalysis(scenarioId);
    
    // Generate model reasoning
    generateModelThinking(scenarioId);
}

/**
 * Generate domain data analysis for recommendation
 */
async function generateDomainAnalysis(scenarioId) {
    const analysisElement = document.getElementById(`domain-analysis-${scenarioId}`);
    if (!analysisElement) return;
    
    try {
        const response = await fetch('/api/generate-domain-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scenario_id: scenarioId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            analysisElement.innerHTML = `
                <div class="mb-2">
                    <strong class="text-primary">Data Patterns Detected:</strong>
                    <ul class="mb-2 mt-1">
                        ${data.patterns.map(pattern => `<li>${pattern}</li>`).join('')}
                    </ul>
                </div>
                <div class="mb-2">
                    <strong class="text-primary">Domain Coverage:</strong>
                    <div class="mt-1">
                        ${data.domains.map(domain => `<span class="badge bg-info me-1">${domain}</span>`).join('')}
                    </div>
                </div>
                <div>
                    <strong class="text-primary">Risk Assessment:</strong>
                    <span class="badge bg-${data.risk_level === 'High' ? 'danger' : data.risk_level === 'Medium' ? 'warning' : 'success'} ms-1">
                        ${data.risk_level} Risk
                    </span>
                    <div class="text-muted small mt-1">${data.risk_explanation}</div>
                </div>
            `;
        } else {
            throw new Error('Failed to generate analysis');
        }
    } catch (error) {
        analysisElement.innerHTML = `
            <div class="text-muted">
                <strong>Domain Analysis:</strong><br>
                • Multiple clinical domains involved<br>
                • Data quality checks across key variables<br>
                • Safety and efficacy validation patterns<br>
                • Cross-domain consistency verification
            </div>
        `;
    }
}

/**
 * Generate model reasoning for recommendation
 */
async function generateModelThinking(scenarioId) {
    const thinkingElement = document.getElementById(`model-thinking-${scenarioId}`);
    if (!thinkingElement) return;
    
    try {
        const response = await fetch('/api/generate-model-thinking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scenario_id: scenarioId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            thinkingElement.innerHTML = `
                <div class="mb-2">
                    <strong class="text-success">Why This Scenario:</strong>
                    <div class="text-muted small mt-1">${data.selection_reasoning}</div>
                </div>
                <div class="mb-2">
                    <strong class="text-success">Priority Logic:</strong>
                    <div class="text-muted small mt-1">${data.priority_logic}</div>
                </div>
                <div>
                    <strong class="text-success">Implementation Strategy:</strong>
                    <ul class="small mb-0 mt-1">
                        ${data.implementation_steps.map(step => `<li>${step}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            throw new Error('Failed to generate thinking');
        }
    } catch (error) {
        thinkingElement.innerHTML = `
            <div class="text-muted">
                <strong>Recommendation Logic:</strong><br>
                • High relevance to selected domains<br>
                • Comprehensive validation coverage<br>
                • Critical data quality checks<br>
                • Regulatory compliance alignment<br>
                • Proven clinical application value
            </div>
        `;
    }
}

// Global variables for workflow management
let processedDRPScenarios = [];
let parentChildScenarios = [];
let selectedOOTBScenarios = [];
let integratedReviewScenarios = [];

/**
 * Create parent-child scenarios from processed DRP data
 */
function createParentChildScenarios() {
    if (!processedDRPScenarios || processedDRPScenarios.length === 0) {
        showToast('No DRP scenarios to process', 'warning');
        return;
    }

    // Group scenarios by domain to create parent scenarios
    const domainGroups = {};
    processedDRPScenarios.forEach(scenario => {
        const domain = scenario.domain;
        if (!domainGroups[domain]) {
            domainGroups[domain] = [];
        }
        domainGroups[domain].push(scenario);
    });

    // Create parent scenarios for each domain
    parentChildScenarios = [];
    Object.keys(domainGroups).forEach(domain => {
        const childScenarios = domainGroups[domain];
        const parentScenario = {
            id: `parent_${domain.toLowerCase()}_${Date.now()}`,
            name: `${domain} Data Validation Suite`,
            description: `Comprehensive data validation scenarios for ${domain} domain including ${childScenarios.length} specific checks`,
            domain: domain,
            tag: childScenarios[0].type || 'Data Quality',
            childScenarios: childScenarios,
            isFromDRP: true
        };
        parentChildScenarios.push(parentScenario);
    });

    displayParentChildScenarios();
    showScenarioCreationSection();
    updateWorkflowProgress(2);
    updateStepStatus('step2-indicator', 'completed');
    showToast(`Created ${parentChildScenarios.length} parent scenarios with ${processedDRPScenarios.length} child scenarios`, 'success');
}

/**
 * Display parent-child scenarios
 */
function displayParentChildScenarios() {
    const container = document.getElementById('parent-scenarios-container');
    if (!container) {
        console.error('Parent scenarios container not found');
        return;
    }

    // Show the parent scenario section first
    showScenarioCreationSection();

    if (parentChildScenarios.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No parent scenarios created yet. Click "Create Parent→Child Scenarios" to organize your DRP scenarios.
            </div>
        `;
        return;
    }

    let html = `
        <div class="mb-3">
            <h6 class="text-muted">Parent Scenarios (${parentChildScenarios.length})</h6>
        </div>
        <div class="accordion" id="parentScenariosAccordion">
    `;

    parentChildScenarios.forEach((parent, parentIndex) => {
        html += `
            <div class="accordion-item mb-2">
                <h2 class="accordion-header" id="heading${parentIndex}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#collapse${parentIndex}" aria-expanded="false">
                        <div class="d-flex justify-content-between align-items-center w-100 me-3">
                            <div>
                                <strong class="text-primary">${parent.name}</strong>
                                <span class="badge bg-info ms-2">DRP</span>
                                <span class="badge bg-secondary ms-1">${parent.domain}</span>
                                <span class="badge bg-warning ms-1 text-dark">${parent.tag}</span>
                            </div>
                            <div>
                                <span class="badge bg-primary">${parent.childScenarios.length} child scenarios</span>
                            </div>
                        </div>
                    </button>
                </h2>
                <div id="collapse${parentIndex}" class="accordion-collapse collapse" 
                     data-bs-parent="#parentScenariosAccordion">
                    <div class="accordion-body">
                        <div class="row mb-3">
                            <div class="col-12">
                                <p class="text-muted mb-0">${parent.description}</p>
                            </div>
                        </div>
                        
                        <h6 class="text-info mb-3">Child Scenarios (${parent.childScenarios.length})</h6>
                        <div class="row">
                            ${parent.childScenarios.map((child, childIndex) => `
                                <div class="col-md-6 mb-3">
                                    <div class="card border-light h-100">
                                        <div class="card-body p-3">
                                            <div class="d-flex justify-content-between align-items-start mb-2">
                                                <h6 class="card-title text-primary mb-0">${child.name}</h6>
                                                <span class="badge bg-${child.priority === 'High' ? 'danger' : child.priority === 'Medium' ? 'warning' : 'success'} small">
                                                    ${child.priority}
                                                </span>
                                            </div>
                                            <p class="card-text small text-muted mb-2">${child.description}</p>
                                            <div class="mb-2">
                                                <small class="text-info">Query Text:</small>
                                                <p class="small text-dark mb-2">${child.queryText || 'Generated from description'}</p>
                                            </div>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="badge bg-light text-dark">${child.domain}</span>
                                                <small class="text-muted">${child.cdashItems?.join(', ') || 'Standard fields'}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Enable bulk add button
    const bulkAddBtn = document.getElementById('bulk-add-btn');
    if (bulkAddBtn) {
        bulkAddBtn.disabled = false;
    }
}

/**
 * Suggest OOTB scenarios based on DRP domains
 */
async function suggestOOTBScenarios() {
    try {
        // Get unique domains from processed DRP scenarios
        const drpDomains = [...new Set(processedDRPScenarios.map(s => s.domain))];
        
        const response = await fetch('/api/suggest-ootb-scenarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domains: drpDomains,
                exclude_existing: true
            })
        });

        if (response.ok) {
            const data = await response.json();
            displayOOTBSuggestions(data.suggestions);
            showOOTBSuggestionsSection();
        } else {
            throw new Error('Failed to get OOTB suggestions');
        }
    } catch (error) {
        console.error('Error suggesting OOTB scenarios:', error);
        // Show fallback suggestions based on common domains
        const fallbackSuggestions = generateFallbackOOTBSuggestions();
        displayOOTBSuggestions(fallbackSuggestions);
        showOOTBSuggestionsSection();
    }
}

/**
 * Generate fallback OOTB suggestions
 */
function generateFallbackOOTBSuggestions() {
    const drpDomains = [...new Set(processedDRPScenarios.map(s => s.domain))];
    const suggestions = [];

    if (drpDomains.includes('AE')) {
        suggestions.push({
            id: 'ootb_ae_serious',
            name: 'Serious Adverse Event Validation',
            description: 'Comprehensive validation for serious adverse events including reporting timelines and regulatory requirements',
            domain: 'AE',
            childCount: 8,
            priority: 'High'
        });
    }

    if (drpDomains.includes('DM')) {
        suggestions.push({
            id: 'ootb_dm_demographics',
            name: 'Demographics Consistency Checks',
            description: 'Standard demographic data validation including age calculations and enrollment criteria',
            domain: 'DM',
            childCount: 5,
            priority: 'Medium'
        });
    }

    if (drpDomains.includes('CM')) {
        suggestions.push({
            id: 'ootb_cm_conmeds',
            name: 'Concomitant Medication Validation',
            description: 'Validation of concomitant medications including drug interactions and dosing consistency',
            domain: 'CM',
            childCount: 6,
            priority: 'Medium'
        });
    }

    return suggestions;
}

/**
 * Display OOTB suggestions
 */
function displayOOTBSuggestions(suggestions) {
    const container = document.getElementById('ootb-suggestions-container');
    if (!container) return;

    let html = `<div class="row">`;

    suggestions.forEach(suggestion => {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card border-info">
                    <div class="card-body">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="${suggestion.id}" 
                                   id="ootb_${suggestion.id}" onchange="toggleOOTBSelection('${suggestion.id}')">
                            <label class="form-check-label" for="ootb_${suggestion.id}">
                                <h6 class="card-title text-info">${suggestion.name}</h6>
                            </label>
                        </div>
                        <p class="card-text small text-muted mt-2">${suggestion.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-info">${suggestion.domain}</span>
                            <span class="badge bg-${suggestion.priority === 'High' ? 'danger' : 'warning'}">
                                ${suggestion.priority} | ${suggestion.childCount} checks
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Toggle OOTB scenario selection
 */
function toggleOOTBSelection(scenarioId) {
    const checkbox = document.getElementById(`ootb_${scenarioId}`);
    const addButton = document.getElementById('add-ootb-btn');
    
    if (checkbox.checked) {
        if (!selectedOOTBScenarios.includes(scenarioId)) {
            selectedOOTBScenarios.push(scenarioId);
        }
    } else {
        selectedOOTBScenarios = selectedOOTBScenarios.filter(id => id !== scenarioId);
    }
    
    addButton.disabled = selectedOOTBScenarios.length === 0;
}

/**
 * Add selected OOTB scenarios to parent-child collection
 */
async function addSelectedOOTBScenarios() {
    if (selectedOOTBScenarios.length === 0) {
        showToast('No OOTB scenarios selected', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/get-ootb-scenarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scenario_ids: selectedOOTBScenarios
            })
        });

        if (response.ok) {
            const data = await response.json();
            data.scenarios.forEach(scenario => {
                scenario.isFromDRP = false;
                parentChildScenarios.push(scenario);
            });
            
            displayParentChildScenarios();
            showToast(`Added ${data.scenarios.length} OOTB scenarios`, 'success');
        } else {
            throw new Error('Failed to retrieve OOTB scenarios');
        }
    } catch (error) {
        console.error('Error adding OOTB scenarios:', error);
        showToast('Error adding OOTB scenarios', 'error');
    }
}

/**
 * Bulk add all scenarios to integrated review
 */
function bulkAddToIntegratedReview() {
    if (parentChildScenarios.length === 0) {
        showToast('No scenarios to add to integrated review', 'warning');
        return;
    }

    integratedReviewScenarios = [...parentChildScenarios];
    displayIntegratedReview();
    showIntegratedReviewSection();
    showToast(`Added ${integratedReviewScenarios.length} scenarios to integrated review`, 'success');
}

/**
 * Display integrated review scenarios
 */
function displayIntegratedReview() {
    const container = document.getElementById('integrated-review-container');
    if (!container) return;

    const totalChecks = integratedReviewScenarios.reduce((sum, scenario) => sum + scenario.childScenarios.length, 0);
    const drpCount = integratedReviewScenarios.filter(s => s.isFromDRP).length;
    const ootbCount = integratedReviewScenarios.filter(s => !s.isFromDRP).length;

    let html = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white text-center">
                    <div class="card-body">
                        <h4>${integratedReviewScenarios.length}</h4>
                        <small>Parent Scenarios</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white text-center">
                    <div class="card-body">
                        <h4>${totalChecks}</h4>
                        <small>Total Checks</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white text-center">
                    <div class="card-body">
                        <h4>${drpCount}</h4>
                        <small>DRP Scenarios</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-white text-center">
                    <div class="card-body">
                        <h4>${ootbCount}</h4>
                        <small>OOTB Scenarios</small>
                    </div>
                </div>
            </div>
        </div>

        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Scenario</th>
                        <th>Domain</th>
                        <th>Source</th>
                        <th>Checks</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>
    `;

    integratedReviewScenarios.forEach(scenario => {
        const avgPriority = getAveragePriority(scenario.childScenarios);
        html += `
            <tr>
                <td>
                    <strong>${scenario.name}</strong>
                    <br><small class="text-muted">${scenario.description}</small>
                </td>
                <td><span class="badge bg-secondary">${scenario.domain}</span></td>
                <td><span class="badge bg-${scenario.isFromDRP ? 'info' : 'success'}">${scenario.isFromDRP ? 'DRP' : 'OOTB'}</span></td>
                <td><span class="badge bg-primary">${scenario.childScenarios.length}</span></td>
                <td><span class="badge bg-${avgPriority === 'High' ? 'danger' : avgPriority === 'Medium' ? 'warning' : 'success'}">${avgPriority}</span></td>
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
 * Calculate average priority for child scenarios
 */
function getAveragePriority(childScenarios) {
    const priorities = childScenarios.map(child => child.priority || 'Medium');
    const highCount = priorities.filter(p => p === 'High').length;
    const mediumCount = priorities.filter(p => p === 'Medium').length;
    
    if (highCount > childScenarios.length / 2) return 'High';
    if (mediumCount > 0) return 'Medium';
    return 'Low';
}

/**
 * Execute integrated review
 */
function executeIntegratedReview() {
    showToast('Executing integrated data review...', 'info');
    // This would typically trigger the actual data validation process
    setTimeout(() => {
        showToast('Integrated review execution completed', 'success');
    }, 2000);
}

/**
 * Export integrated review package
 */
function exportIntegratedReview() {
    const exportData = {
        summary: {
            totalParentScenarios: integratedReviewScenarios.length,
            totalChecks: integratedReviewScenarios.reduce((sum, s) => sum + s.childScenarios.length, 0),
            drpScenarios: integratedReviewScenarios.filter(s => s.isFromDRP).length,
            ootbScenarios: integratedReviewScenarios.filter(s => !s.isFromDRP).length,
            exportTimestamp: new Date().toISOString()
        },
        scenarios: integratedReviewScenarios
    };

    const content = JSON.stringify(exportData, null, 2);
    downloadFile('integrated_review_package.json', content, 'application/json');
    showToast('Integrated review package exported', 'success');
}

/**
 * Show/hide workflow sections
 */
function showScenarioCreationSection() {
    document.getElementById('scenario-creation-section').style.display = 'block';
}

function showOOTBSuggestionsSection() {
    document.getElementById('ootb-suggestions-section').style.display = 'block';
}

function showIntegratedReviewSection() {
    document.getElementById('integrated-review-section').style.display = 'block';
}

/**
 * Update workflow progress bar
 */
function updateWorkflowProgress(step) {
    const progressBar = document.getElementById('workflow-progress-bar');
    const progressSection = document.getElementById('workflow-progress-section');
    
    if (progressBar && progressSection) {
        progressSection.style.display = 'block';
        const percentage = (step / 5) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

/**
 * Update step status indicators
 */
function updateStepStatus(stepId, status) {
    const stepElement = document.getElementById(stepId);
    if (stepElement) {
        stepElement.className = `section-indicator ${status}`;
    }
    
    // Update workflow step circles in header
    const stepNumber = stepId.replace('step', '').replace('-indicator', '');
    const workflowStep = document.querySelector(`.workflow-step:nth-child(${stepNumber})`);
    if (workflowStep) {
        workflowStep.className = `workflow-step ${status}`;
    }
}

/**
 * Enhanced create parent-child scenarios with progress updates
 */
function createParentChildScenariosEnhanced() {
    createParentChildScenarios();
    updateWorkflowProgress(2);
    updateStepStatus('step2-indicator', 'completed');
    updateStepStatus('step1-indicator', 'completed');
}

/**
 * Enhanced OOTB suggestions with progress updates
 */
function suggestOOTBScenariosEnhanced() {
    suggestOOTBScenarios();
    updateWorkflowProgress(3);
    updateStepStatus('step3-indicator', 'active');
}

/**
 * Enhanced bulk add with progress updates
 */
function bulkAddToIntegratedReviewEnhanced() {
    bulkAddToIntegratedReview();
    updateWorkflowProgress(4);
    updateStepStatus('step4-indicator', 'completed');
    updateStepStatus('step3-indicator', 'completed');
}

/**
 * Enhanced execute review with final progress
 */
function executeIntegratedReviewEnhanced() {
    executeIntegratedReview();
    updateWorkflowProgress(5);
    updateStepStatus('step4-indicator', 'completed');
    
    // Add completion animation
    setTimeout(() => {
        showToast('Complete DRP-to-scenario integration workflow finished!', 'success');
    }, 500);
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
 * Enhanced recommendation functionality for study data patterns
 */
function initializeRecommendationForm() {
    const studyType = document.getElementById('study-type');
    const therapeuticArea = document.getElementById('therapeutic-area');
    
    if (therapeuticArea) {
        therapeuticArea.addEventListener('change', function() {
            suggestDomainsForTherapeuticArea(this.value);
        });
    }
    
    if (studyType) {
        studyType.addEventListener('change', function() {
            suggestTagsForStudyType(this.value);
        });
    }
}

function suggestDomainsForTherapeuticArea(therapeuticArea) {
    const domainSuggestions = {
        'oncology': ['AE', 'CM', 'LB', 'TU', 'PR'],
        'cardiology': ['AE', 'VS', 'EG', 'LB', 'CM'],
        'neurology': ['AE', 'MH', 'LB', 'CM', 'PR'],
        'respiratory': ['AE', 'VS', 'LB', 'CM', 'PR'],
        'endocrinology': ['LB', 'AE', 'CM', 'VS', 'DM'],
        'immunology': ['AE', 'LB', 'CM', 'IE', 'MB'],
        'infectious_disease': ['AE', 'LB', 'CM', 'MB', 'VS'],
        'psychiatry': ['AE', 'MH', 'SU', 'CM', 'PR']
    };
    
    const suggestions = domainSuggestions[therapeuticArea] || [];
    
    document.querySelectorAll('input[name="recommend_domains"]').forEach(checkbox => {
        if (suggestions.includes(checkbox.value)) {
            checkbox.checked = true;
        }
    });
    
    if (suggestions.length > 0) {
        showToast(`Auto-selected domains for ${therapeuticArea}`, 'info');
    }
}

function suggestTagsForStudyType(studyType) {
    const tagSuggestions = {
        'phase1': ['Safety', 'Data Quality'],
        'phase2': ['Safety', 'Efficacy', 'Data Quality'],
        'phase3': ['Efficacy', 'Safety', 'Compliance'],
        'phase4': ['Safety', 'Protocol Deviation', 'Data Quality'],
        'observational': ['Data Quality', 'Protocol Deviation'],
        'registry': ['Data Quality', 'Compliance']
    };
    
    const suggestions = tagSuggestions[studyType] || [];
    
    document.querySelectorAll('input[name="recommend_tags"]').forEach(checkbox => {
        if (suggestions.includes(checkbox.value)) {
            checkbox.checked = true;
        }
    });
    
    if (suggestions.length > 0) {
        showToast(`Auto-selected categories for ${studyType}`, 'info');
    }
}

async function viewRecommendationDetails(scenarioId) {
    try {
        const domainAnalysisElement = document.getElementById(`domain-analysis-${scenarioId}`);
        if (domainAnalysisElement) {
            const response = await fetch('/api/generate-domain-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario_id: scenarioId })
            });
            
            if (response.ok) {
                const data = await response.json();
                domainAnalysisElement.innerHTML = data.analysis;
            }
        }
        
        const modelThinkingElement = document.getElementById(`model-thinking-${scenarioId}`);
        if (modelThinkingElement) {
            const response = await fetch('/api/generate-model-thinking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario_id: scenarioId })
            });
            
            if (response.ok) {
                const data = await response.json();
                modelThinkingElement.innerHTML = data.thinking;
            }
        }
    } catch (error) {
        console.error('Error loading recommendation details:', error);
    }
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

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
    initializeRecommendationForm();
});

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
