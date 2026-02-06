/**
 * PROGRAMMA PER SALVATAGGIO CODICE C E RELAZIONI DI LABORATORIO
 * Versione 2.0 - Supporto Multi-file, Screenshot e Flowchart
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. STATO DELL'APPLICAZIONE (Dati Interni)
    // ==========================================
    const State = {
        mode: 'code',           // 'code' o 'lab'
        logoBase64: null,      // Immagine logo caricata
        charts: [],            // Array dei grafici/tabelle
        activeCharts: {},      // Istanze Chart.js attive

        // NEW: Multi-file Support
        files: [
            { id: 'main', name: 'main.c', content: '/* Scrivi qui il tuo codice C */' }
        ],
        activeFileId: 'main',

        // NEW: Media
        screenshots: [],       // Array of { src: base64, caption: string }
        screenshotLayout: '2', // '1', '2', '3' colonne
        flowchartCode: '',     // Testo codice Mermaid

        // NEW: CodeMirror Instance
        editor: null,
    };

    // ==========================================
    // 2. ELEMENTI DELL'INTERFACCIA (DOM)
    // ==========================================
    const UI = {
        // Schermate e Navigazione
        screens: {
            home: document.getElementById('home-screen'),
            app: document.getElementById('app-screen'),
            backToHome: document.getElementById('back-to-home')
        },
        // Modalità
        modes: {
            btnPlc: document.getElementById('mode-plc'),
            btnCode: document.getElementById('mode-code'),
            btnLab: document.getElementById('mode-lab'),
            btnFlowchart: document.getElementById('mode-flowchart'),
            title: document.getElementById('app-type-title'),
            subtitle: document.getElementById('app-type-subtitle'),
            editorSection: document.querySelector('.editor-section'),
            labFields: document.getElementById('lab-details-fields'),
            plcFields: document.getElementById('plc-details-fields'),
            flowchartSection: document.querySelector('.flowchart-section')
        },
        // Campi PLC
        plcInputs: {
            cpu: document.getElementById('plc-cpu'),
            env: document.getElementById('plc-env')
        },
        // Campi di Inserimento (Shared)
        inputs: {
            title: document.getElementById('project-title'),
            school: document.getElementById('school-name'),
            student: document.getElementById('student-info'),
            date: document.getElementById('doc-date'),
            exercise: document.getElementById('exercise-text'),

            // Editor
            code: document.getElementById('code-input'),
            tabsBar: document.getElementById('file-tabs-bar'),
            addFileBtn: document.getElementById('add-file-btn'),
            importPlcBtn: document.getElementById('import-plc-btn'),
            plcUpload: document.getElementById('plc-file-upload'),

            // Logo
            logo: document.getElementById('logo-upload'),
            logoStatus: document.getElementById('logo-status'),

            // New Extras
            flowchart: document.getElementById('flowchart-main-input'),
            screenshotUpload: document.getElementById('screenshot-upload'),
            screenshotLayout: document.getElementById('screenshot-layout-select'),
            screenshotList: document.getElementById('screenshots-list'),

            // New Project Management
            btnExport: document.getElementById('export-project-btn'),
            btnImport: document.getElementById('import-project-btn'),
            importUpload: document.getElementById('import-project-upload'),

            // Toolbox
            btnToolbox: document.getElementById('toolbox-btn'),
            toolboxModal: document.getElementById('toolbox-modal'),
            btnCloseToolbox: document.getElementById('close-toolbox'),
            btnCloseToolboxBtn: document.getElementById('close-toolbox-btn'),
            calcOhmBtn: document.getElementById('calc-ohm-btn'),
            ohmStatus: document.getElementById('ohm-status')
        },
        // Campi Laboratorio
        labInputs: {
            objectives: document.getElementById('lab-objectives'),
            materials: document.getElementById('lab-materials'),
            tools: document.getElementById('lab-tools'),
            software: document.getElementById('lab-software'),
            description: document.getElementById('lab-description'),
            calculations: document.getElementById('lab-calculations'),
            conclusions: document.getElementById('lab-conclusions'),
            chartsContainer: document.getElementById('lab-charts-input-container'),
            btnAddChart: document.getElementById('add-chart-btn')
        },
        // Elementi Anteprima PDF
        preview: {
            title: document.getElementById('pdf-title-display'),
            school: document.getElementById('pdf-school-display'),
            student: document.getElementById('pdf-student-display'),
            date: document.getElementById('pdf-date-display'),
            logo: document.getElementById('pdf-logo-container'),
            exerciseContainer: document.getElementById('pdf-exercise-container'),
            exerciseDisplay: document.getElementById('pdf-exercise-display'),

            // Dynamic Containers
            codeContainer: document.getElementById('pdf-code-container'),
            labContainer: document.getElementById('pdf-lab-container'),
            flowchartContainer: document.getElementById('pdf-flowchart-container'),

            screenshotsContainer: document.getElementById('pdf-screenshots-container'),
            screenshotsGrid: document.getElementById('pdf-screenshots-grid')
        },
        // Pulsanti Download e Info
        btns: {
            download: [document.getElementById('download-btn'), document.getElementById('download-btn-top')].filter(btn => btn !== null),
            info: document.getElementById('info-btn')
        },
        // Modal Help
        modal: {
            overlay: document.getElementById('info-modal'),
            body: document.getElementById('modal-body'),
            close: [document.getElementById('close-modal'), document.getElementById('close-modal-btn')]
        }
    };

    const Utils = {
        debounce(func, wait) {
            let timeout;
            return function (...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }
    };

    // ==========================================
    // 3. LOGICA FILE MANAGER (Tabs)
    // ==========================================
    const FileManager = {
        init() {
            // NEW: Initialize CodeMirror
            if (window.CodeMirror && !State.editor) {
                State.editor = CodeMirror.fromTextArea(UI.inputs.code, {
                    mode: "text/x-csrc",
                    theme: "tomorrow-night-bright",
                    lineNumbers: true,
                    autoCloseBrackets: true,
                    matchBrackets: true,
                    indentUnit: 4,
                    tabSize: 4,
                    lineWrapping: true
                });

                // Link editor changes to application state
                State.editor.on('change', () => {
                    this.updateCurrentContent(State.editor.getValue());
                    Renderer.updateAll();
                });
            }

            this.renderTabs();
            // Restore content of active file to editor
            const activeFile = State.files.find(f => f.id === State.activeFileId);
            if (activeFile) {
                if (State.editor) State.editor.setValue(activeFile.content);
                else UI.inputs.code.value = activeFile.content;
            }

            this.draggedFileId = null;
        },

        addFile() {
            const name = prompt("Nome del nuovo file (es. functions.c):", `file${State.files.length + 1}.c`);
            if (name) {
                const newId = 'f-' + Date.now();
                State.files.push({ id: newId, name: name, content: '// ' + name });
                this.switchToFile(newId);
                Renderer.updateAll();
            }
        },

        removeFile(id, e) {
            e.stopPropagation(); // Stop switch event
            if (State.files.length <= 1) {
                alert("Devi avere almeno un file.");
                return;
            }
            if (confirm("Sei sicuro di voler eliminare questo file?")) {
                State.files = State.files.filter(f => f.id !== id);
                if (State.activeFileId === id) {
                    this.switchToFile(State.files[0].id);
                } else {
                    this.renderTabs(); // Just re-render tabs, no content switch needed
                    Renderer.updateAll();
                }
            }
        },

        switchToFile(id) {
            // Save current content first
            const currentFile = State.files.find(f => f.id === State.activeFileId);
            if (currentFile) {
                currentFile.content = State.editor ? State.editor.getValue() : UI.inputs.code.value;
            }

            // Switch
            State.activeFileId = id;
            const newFile = State.files.find(f => f.id === id);
            if (newFile) {
                if (State.editor) {
                    // Update mode based on file extension
                    const ext = newFile.name.split('.').pop().toLowerCase();
                    let mode = "text/x-csrc";
                    if (ext === 'scl' || ext === 'st' || ext === 'pas') mode = "text/x-pascal";
                    State.editor.setOption("mode", mode);
                    State.editor.setValue(newFile.content);
                } else {
                    UI.inputs.code.value = newFile.content;
                }
            }

            this.renderTabs();
            Renderer.updateAll();
        },

        updateCurrentContent(text) {
            const currentFile = State.files.find(f => f.id === State.activeFileId);
            if (currentFile) currentFile.content = text;
        },

        // New method to read imported PLC files (XML/Text)
        readPlcFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                let extractedCode = content;

                // Basic XML parsing for TIA Portal exports (.xml)
                if (file.name.toLowerCase().endsWith('.xml')) {
                    try {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(content, "text/xml");

                        // Attempt 1: Look for SCL/StatementList in TIA Openness XML
                        // Structure usually: <AttributeList> -> <Interface> | <StatementList>
                        let codeParts = [];

                        const interfaceNode = xmlDoc.querySelector("Interface");
                        if (interfaceNode) codeParts.push(interfaceNode.textContent);

                        const statementListNode = xmlDoc.querySelector("StatementList");
                        if (statementListNode) codeParts.push(statementListNode.textContent);

                        // Attempt 2: Generic text content if header found
                        if (codeParts.length === 0) {
                            // If it's a project file (like the one pasted), it might not have code directly visible easily.
                            // But if it's a block export, it should have.
                            // Let's just strip tags if it looks like XML but we didn't find specific blocks.
                            // Or better, if it's the specific format user pasted (ProjectData), tell them to export blocks.
                            if (xmlDoc.querySelector("ProjectData")) {
                                alert("Questo sembra un file di progetto globale. Per favore esporta il singolo blocco (Sorgente o XML del blocco) per vedere il codice.");
                                return;
                            }
                        } else {
                            extractedCode = codeParts.join('\n\n');
                        }

                    } catch (err) { console.warn("XML Parse error", err); }
                }

                // Create a new tab for this file
                const newId = 'plc-' + Date.now();
                State.files.push({ id: newId, name: file.name, content: extractedCode });
                this.switchToFile(newId);
                Renderer.updateAll();
            };
            reader.readAsText(file);
        },

        renderTabs() {
            UI.inputs.tabsBar.innerHTML = '';
            State.files.forEach((file, index) => {
                const tab = document.createElement('div');
                tab.className = `file-tab ${file.id === State.activeFileId ? 'active' : ''}`;
                tab.draggable = true;
                tab.dataset.id = file.id;
                tab.dataset.index = index;

                const nameSpan = document.createElement('span');
                nameSpan.textContent = file.name;
                tab.appendChild(nameSpan);

                // Close button (only if more than 1 file)
                if (State.files.length > 1) {
                    const closeBtn = document.createElement('span');
                    closeBtn.innerHTML = '&times;';
                    closeBtn.className = 'close-tab';
                    closeBtn.onclick = (e) => this.removeFile(file.id, e);
                    tab.appendChild(closeBtn);
                }

                // Interaction Events
                tab.onclick = () => {
                    if (file.id !== State.activeFileId) this.switchToFile(file.id);
                };

                // Drag & Drop Events
                tab.ondragstart = (e) => {
                    this.draggedFileId = file.id;
                    tab.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                };

                tab.ondragend = () => {
                    tab.classList.remove('dragging');
                    document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('drag-over'));
                };

                tab.ondragover = (e) => {
                    e.preventDefault();
                    tab.classList.add('drag-over');
                };

                tab.ondragleave = () => {
                    tab.classList.remove('drag-over');
                };

                tab.ondrop = (e) => {
                    e.preventDefault();
                    const targetId = file.id;
                    if (this.draggedFileId && this.draggedFileId !== targetId) {
                        this.reorderFiles(this.draggedFileId, targetId);
                    }
                };

                UI.inputs.tabsBar.appendChild(tab);
            });
        },

        reorderFiles(draggedId, targetId) {
            const draggedIdx = State.files.findIndex(f => f.id === draggedId);
            const targetIdx = State.files.findIndex(f => f.id === targetId);

            if (draggedIdx !== -1 && targetIdx !== -1) {
                const [draggedFile] = State.files.splice(draggedIdx, 1);
                State.files.splice(targetIdx, 0, draggedFile);
                this.renderTabs();
                Renderer.updateAll();
            }
        }
    };

    // ==========================================
    // 4. SCREENSHOT MANAGER
    // ==========================================
    const ScreenshotManager = {
        add(files) {
            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    State.screenshots.push({
                        id: Date.now() + Math.random(),
                        src: e.target.result,
                        caption: file.name
                    });
                    this.renderList();
                    Renderer.updateAll();
                };
                reader.readAsDataURL(file);
            });
        },

        remove(id) {
            State.screenshots = State.screenshots.filter(s => s.id !== id);
            this.renderList();
            Renderer.updateAll();
        },

        updateCaption(id, text) {
            const img = State.screenshots.find(s => s.id === id);
            if (img) img.caption = text;
            // No need to re-render list, prevents focus loss
            // Just update PDF
            Renderer.updateAll();
        },

        renderList() {
            UI.inputs.screenshotList.innerHTML = '';
            State.screenshots.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'screenshot-preview-item';
                div.draggable = true;
                div.title = "Trascina per riordinare";

                const img = document.createElement('img');
                img.src = item.src;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-screenshot';
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = (e) => { e.stopPropagation(); this.remove(item.id); };

                div.appendChild(img);
                div.appendChild(removeBtn);

                // Drag and Drop reordering
                div.ondragstart = (e) => {
                    this.draggedId = item.id;
                    div.classList.add('dragging');
                };
                div.ondragend = () => div.classList.remove('dragging');
                div.ondragover = (e) => e.preventDefault();
                div.ondrop = (e) => {
                    e.preventDefault();
                    if (this.draggedId && this.draggedId !== item.id) {
                        this.reorder(this.draggedId, item.id);
                    }
                };

                UI.inputs.screenshotList.appendChild(div);
            });
        },

        reorder(draggedId, targetId) {
            const fromIdx = State.screenshots.findIndex(s => s.id === draggedId);
            const toIdx = State.screenshots.findIndex(s => s.id === targetId);
            if (fromIdx !== -1 && toIdx !== -1) {
                const [moved] = State.screenshots.splice(fromIdx, 1);
                State.screenshots.splice(toIdx, 0, moved);
                this.renderList();
                Renderer.updateAll();
            }
        }
    };

    // ==========================================
    // 5. PROJECT MANAGER (Export/Import)
    // ==========================================
    const ProjectManager = {
        export() {
            const data = {
                version: "2.5",
                timestamp: Date.now(),
                mode: State.mode,
                title: UI.inputs.title.value,
                school: UI.inputs.school.value,
                student: UI.inputs.student.value,
                date: UI.inputs.date.value,
                logo: State.logoBase64,
                files: State.files,
                screenshots: State.screenshots,
                screenshotLayout: State.screenshotLayout,
                flowchart: UI.inputs.flowchart.value,
                exercise: UI.inputs.exercise.value,
                lab: {
                    objectives: UI.labInputs.objectives.value,
                    materials: UI.labInputs.materials.value,
                    tools: UI.labInputs.tools.value,
                    software: UI.labInputs.software.value,
                    description: UI.labInputs.description.value,
                    calculations: UI.labInputs.calculations.value,
                    conclusions: UI.labInputs.conclusions.value,
                    charts: State.charts,
                    circuit: window.CircuitEditor ? {
                        components: CircuitEditor.components,
                        wires: CircuitEditor.wires
                    } : null
                },
                plc: {
                    cpu: UI.plcInputs.cpu.value,
                    env: UI.plcInputs.env.value
                }
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${UI.inputs.title.value.replace(/ /g, '_')}_progetto.lab`;
            a.click();
            URL.revokeObjectURL(url);
        },

        import(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    // Restore Global State
                    UI.inputs.school.value = data.school || '';
                    UI.inputs.student.value = data.student || '';
                    UI.inputs.date.value = data.date || '';
                    State.logoBase64 = data.logo || null;

                    // Restore Fields
                    UI.inputs.title.value = data.title || '';
                    UI.inputs.exercise.value = data.exercise || '';
                    UI.inputs.flowchart.value = data.flowchart || '';

                    State.files = data.files || [];
                    State.screenshots = data.screenshots || [];
                    State.screenshotLayout = data.screenshotLayout || '2';

                    if (data.lab) {
                        UI.labInputs.objectives.value = data.lab.objectives || '';
                        UI.labInputs.materials.value = data.lab.materials || '';
                        UI.labInputs.tools.value = data.lab.tools || '';
                        UI.labInputs.software.value = data.lab.software || '';
                        UI.labInputs.description.value = data.lab.description || '';
                        UI.labInputs.calculations.value = data.lab.calculations || '';
                        UI.labInputs.conclusions.value = data.lab.conclusions || '';
                        State.charts = data.lab.charts || [];

                        if (data.lab.circuit && window.CircuitEditor) {
                            CircuitEditor.components = data.lab.circuit.components || [];
                            CircuitEditor.wires = data.lab.circuit.wires || [];
                        }
                    }

                    if (data.plc) {
                        UI.plcInputs.cpu.value = data.plc.cpu || '';
                        UI.plcInputs.env.value = data.plc.env || '';
                    }

                    // Switch to the project mode
                    Events.switchMode(data.mode || 'code');

                    // Refresh UI
                    FileManager.init();
                    ScreenshotManager.renderList();
                    Renderer.updateAll();
                    alert("Progetto importato con successo!");
                } catch (err) {
                    console.error(err);
                    alert("Errore durante l'importazione del file .lab");
                }
            };
            reader.readAsText(file);
        }
    };

    // ==========================================
    // 6. ELECTRONIC TOOLBOX
    // ==========================================
    const Toolbox = {
        init() {
            // Ohm's Law
            UI.inputs.calcOhmBtn.onclick = () => this.calculateOhm();

            // Resistor Colors
            const bandSelects = ['res-band-1', 'res-band-2', 'res-band-mul', 'res-band-tol'];
            bandSelects.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.onchange = () => this.calculateResistor();
            });

            // Initially calculate res
            this.calculateResistor();
        },

        toggle(show) {
            if (show) UI.inputs.toolboxModal.classList.remove('hidden');
            else UI.inputs.toolboxModal.classList.add('hidden');
        },

        calculateOhm() {
            const v = parseFloat(document.getElementById('ohm-v').value);
            const r = parseFloat(document.getElementById('ohm-r').value);
            const i = parseFloat(document.getElementById('ohm-i').value);
            const status = UI.inputs.ohmStatus;

            if (!isNaN(v) && !isNaN(r) && isNaN(i)) {
                document.getElementById('ohm-i').value = (v / r).toFixed(4);
                status.textContent = "Corrente (I) calcolata.";
            } else if (!isNaN(v) && isNaN(r) && !isNaN(i)) {
                document.getElementById('ohm-r').value = (v / i).toFixed(2);
                status.textContent = "Resistenza (R) calcolata.";
            } else if (isNaN(v) && !isNaN(r) && !isNaN(i)) {
                document.getElementById('ohm-v').value = (r * i).toFixed(2);
                status.textContent = "Tensione (V) calcolata.";
            } else {
                status.textContent = "Inserisci esattamente 2 valori.";
            }
        },

        calculateResistor() {
            const b1 = parseInt(document.getElementById('res-band-1').value);
            const b2 = parseInt(document.getElementById('res-band-2').value);
            const mul = parseFloat(document.getElementById('res-band-mul').value);
            const tol = document.getElementById('res-band-tol').value;

            const val = (b1 * 10 + b2) * mul;
            let displayVal = val >= 1000000 ? (val / 1000000).toFixed(2) + " MΩ" :
                val >= 1000 ? (val / 1000).toFixed(2) + " kΩ" :
                    val + " Ω";

            document.getElementById('res-result').textContent = `Risultato: ${displayVal} ±${tol}%`;
        }
    };

    // ==========================================
    // 7. GESTIONE DATI E MEMORIA (Storage)
    // ==========================================
    const Storage = {
        save() {
            const mode = State.mode;
            let prefix = 'c-';
            if (mode === 'lab') prefix = 'l-';
            if (mode === 'flowchart') prefix = 'f-';
            if (mode === 'plc') prefix = 'p-';

            try {
                // Dati Comuni
                localStorage.setItem('shared-school', UI.inputs.school.value);
                localStorage.setItem('shared-student', UI.inputs.student.value);
                localStorage.setItem('shared-date', UI.inputs.date.value);
                localStorage.setItem('shared-logo', State.logoBase64 || '');
                localStorage.setItem(prefix + 'screenshots', JSON.stringify(State.screenshots));

                // Dati Specifici
                localStorage.setItem(prefix + 'title', UI.inputs.title.value);
                localStorage.setItem(prefix + 'exercise', UI.inputs.exercise.value);
                localStorage.setItem(prefix + 'flowchart', UI.inputs.flowchart.value);

                if (mode === 'code' || mode === 'plc') {
                    // Save files
                    localStorage.setItem(prefix + 'files', JSON.stringify(State.files));
                }

                if (mode === 'plc') {
                    localStorage.setItem(prefix + 'cpu', UI.plcInputs.cpu.value);
                    localStorage.setItem(prefix + 'env', UI.plcInputs.env.value);
                }

                if (mode === 'lab') {
                    localStorage.setItem(prefix + 'objectives', UI.labInputs.objectives.value);
                    localStorage.setItem(prefix + 'materials', UI.labInputs.materials.value);
                    localStorage.setItem(prefix + 'tools', UI.labInputs.tools.value);
                    localStorage.setItem(prefix + 'software', UI.labInputs.software.value);
                    localStorage.setItem(prefix + 'description', UI.labInputs.description.value);
                    localStorage.setItem(prefix + 'calculations', UI.labInputs.calculations.value);
                    localStorage.setItem(prefix + 'conclusions', UI.labInputs.conclusions.value);
                    localStorage.setItem(prefix + 'charts-json', JSON.stringify(State.charts));

                    // SAVE CIRCUIT:
                    if (window.CircuitEditor) {
                        localStorage.setItem(prefix + 'circuit-components', JSON.stringify(CircuitEditor.components));
                        localStorage.setItem(prefix + 'circuit-wires', JSON.stringify(CircuitEditor.wires));
                    }
                }

                // Screenshot Layout (persisted per project)
                localStorage.setItem(prefix + 'screenshot-layout', State.screenshotLayout);

            } catch (e) { console.warn("Errore Storage (Quota Exceeded?)", e); }
        },

        load(mode) {
            let prefix = 'c-';
            let defaultTitle = 'Codice Sorgente C';

            if (mode === 'lab') {
                prefix = 'l-';
                defaultTitle = 'Relazione di Laboratorio';
            }
            if (mode === 'flowchart') {
                prefix = 'f-';
                defaultTitle = 'Diagramma di Flusso';
            }
            if (mode === 'plc') {
                prefix = 'p-';
                defaultTitle = 'Progetto PLC (LAD/SCL)';
            }

            // Carica Dati Comuni
            UI.inputs.school.value = localStorage.getItem('shared-school') || '';
            UI.inputs.student.value = localStorage.getItem('shared-student') || '';
            UI.inputs.date.value = localStorage.getItem('shared-date') || '';
            State.logoBase64 = localStorage.getItem('shared-logo') || null;

            try {
                State.screenshots = JSON.parse(localStorage.getItem(prefix + 'screenshots')) || [];
            } catch { State.screenshots = []; }
            ScreenshotManager.renderList();

            // Carica Dati Specifici
            UI.inputs.title.value = localStorage.getItem(prefix + 'title') || defaultTitle;
            UI.inputs.exercise.value = localStorage.getItem(prefix + 'exercise') || '';
            UI.inputs.flowchart.value = localStorage.getItem(prefix + 'flowchart') || '';

            if (mode === 'code' || mode === 'plc') {
                try {
                    const savedFiles = JSON.parse(localStorage.getItem(prefix + 'files'));
                    if (savedFiles && Array.isArray(savedFiles) && savedFiles.length > 0) {
                        State.files = savedFiles;
                        State.activeFileId = State.files[0].id;
                    } else {
                        // Default Fallback
                        if (mode === 'plc') {
                            State.files = [{ id: 'ob1', name: 'Main_OB1.scl', content: '(* Blocchi Organizzativi e Logica *)' }];
                            State.activeFileId = 'ob1';
                        } else {
                            State.files = [{ id: 'main', name: 'main.c', content: '/* Nuovo Progetto */' }];
                            State.activeFileId = 'main';
                        }
                    }
                } catch {
                    if (mode === 'plc') {
                        State.files = [{ id: 'ob1', name: 'Main_OB1.scl', content: '(* Blocchi Organizzativi e Logica *)' }];
                        State.activeFileId = 'ob1';
                    } else {
                        State.files = [{ id: 'main', name: 'main.c', content: '/* Nuovo Progetto */' }];
                        State.activeFileId = 'main';
                    }
                }
                FileManager.init();
            }

            if (mode === 'plc') {
                UI.plcInputs.cpu.value = localStorage.getItem(prefix + 'cpu') || '';
                UI.plcInputs.env.value = localStorage.getItem(prefix + 'env') || 'Tia Portal';
                // Restore logic moved to switchMode, but re-applying visibility here just in case init sequence matters
                if (UI.inputs.importPlcBtn) UI.inputs.importPlcBtn.classList.remove('hidden');
            } else {
                if (UI.inputs.importPlcBtn) UI.inputs.importPlcBtn.classList.add('hidden');
            }

            if (mode === 'lab') {
                UI.labInputs.objectives.value = localStorage.getItem(prefix + 'objectives') || '';
                UI.labInputs.materials.value = localStorage.getItem(prefix + 'materials') || '';
                UI.labInputs.tools.value = localStorage.getItem(prefix + 'tools') || '';
                UI.labInputs.software.value = localStorage.getItem(prefix + 'software') || '';
                UI.labInputs.description.value = localStorage.getItem(prefix + 'description') || '';
                UI.labInputs.calculations.value = localStorage.getItem(prefix + 'calculations') || '';
                UI.labInputs.conclusions.value = localStorage.getItem(prefix + 'conclusions') || '';

                try {
                    State.charts = JSON.parse(localStorage.getItem(prefix + 'charts-json')) || [];
                } catch { State.charts = []; }

                // LOAD CIRCUIT:
                try {
                    if (window.CircuitEditor) {
                        CircuitEditor.components = JSON.parse(localStorage.getItem(prefix + 'circuit-components')) || [];
                        CircuitEditor.wires = JSON.parse(localStorage.getItem(prefix + 'circuit-wires')) || [];
                        CircuitEditor.draw();
                    }
                } catch (e) { console.warn("Errore caricamento circuito", e); }

                // Load Layout
                State.screenshotLayout = localStorage.getItem(prefix + 'screenshot-layout') || '2';
                if (UI.inputs.screenshotLayout) UI.inputs.screenshotLayout.value = State.screenshotLayout;

            } else {
                State.charts = [];
            }
        }
    };

    // ==========================================
    // 6. RENDERER (Preview Generation)
    // ==========================================
    const Parser = {
        markdown(text) {
            if (!text) return "";

            let formatted = text;

            // 1. Supporto Elenchi Puntati (righe che iniziano con - o *)
            // Usiamo una regex che trova l'inizio riga e sostituisce con un pallino
            formatted = formatted.replace(/^[\-\*]\s+/gm, '• ');

            // NEW: Supporto per separatori usati dall'utente (— o --) che indicano nuovi punti
            // Se troviamo '—' o '--' in mezzo al testo, aggiungiamo un a capo prima per chiarezza (come richiesto per Materiali e Calcoli)
            formatted = formatted.replace(/([^\n])\s*—\s*/g, '$1<br>— ');
            formatted = formatted.replace(/([^\n])\s*--\s*/g, '$1<br>• ');

            // 2. Grassetto (**testo**)
            formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // 3. Newlines (gestisce a capo, mantenendo compatibilità con MathJax)
            return formatted.replace(/\n/g, '<br>');
        }
    };

    const Renderer = {
        updateAll() {
            try {
                const mode = State.mode;

                // 1. Dati Comuni (Header)
                this.renderHeader();

                // 2. Render Lab Sections (Dynamic)
                this.renderLab(mode);

                // 3. Render Files (Dynamic)
                this.renderFiles(mode);

                // 4. Render Flowchart (Dynamic)
                this.renderFlowchart(mode);

                // 5. Screenshots
                this.renderScreenshots();

                // 6. Conclusions (Moved after screenshots)
                this.renderConclusions(mode);

                Storage.save();
            } catch (e) {
                console.error("Errore durante il rendering dell'anteprima:", e);
            }
        },

        renderConclusions(mode) {
            const container = document.getElementById('pdf-conclusions-container');
            if (!container) return;
            container.innerHTML = '';

            if (mode === 'lab' && UI.labInputs.conclusions.value.trim()) {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'pdf-lab-section';

                const labelDiv = document.createElement('div');
                labelDiv.className = 'pdf-lab-label';
                labelDiv.textContent = "Conclusioni:";

                const contentDiv = document.createElement('div');
                contentDiv.style.paddingLeft = '5px';
                contentDiv.innerHTML = Parser.markdown(UI.labInputs.conclusions.value);

                sectionDiv.appendChild(labelDiv);
                sectionDiv.appendChild(contentDiv);
                container.appendChild(sectionDiv);

                // Trigger MathJax for conclusions (v2 style)
                if (window.MathJax && window.MathJax.Hub) {
                    window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, container]);
                }
            }
        },

        renderHeader() {
            if (UI.inputs.title) UI.preview.title.textContent = UI.inputs.title.value;
            if (UI.inputs.school) UI.preview.school.textContent = UI.inputs.school.value;
            if (UI.inputs.student) UI.preview.student.textContent = UI.inputs.student.value;

            if (UI.inputs.date && UI.inputs.date.value) {
                const d = new Date(UI.inputs.date.value);
                UI.preview.date.textContent = d.toLocaleDateString('it-IT');
            } else { UI.preview.date.textContent = ""; }

            // Logo
            UI.preview.logo.innerHTML = '';
            if (State.logoBase64) {
                const img = document.createElement('img');
                img.src = State.logoBase64;
                UI.preview.logo.appendChild(img);
                if (UI.inputs.logoStatus) {
                    UI.inputs.logoStatus.textContent = "Caricato ✓";
                    UI.inputs.logoStatus.style.color = "#38bdf8";
                }
            } else {
                if (UI.inputs.logoStatus) {
                    UI.inputs.logoStatus.textContent = "Mancante";
                    UI.inputs.logoStatus.style.color = "";
                }
            }

            // Traccia/Esercizio
            if (UI.inputs.exercise && UI.inputs.exercise.value.trim()) {
                UI.preview.exerciseDisplay.innerHTML = Parser.markdown(UI.inputs.exercise.value);
                UI.preview.exerciseContainer.classList.remove('hidden');
            } else { UI.preview.exerciseContainer.classList.add('hidden'); }
        },

        renderLab(mode) {
            const container = UI.preview.labContainer || document.getElementById('pdf-lab-container');
            if (!container) return;
            container.innerHTML = '';

            if (mode !== 'lab') return;

            // Helper to create sections
            const createSection = (label, value) => {
                if (!value || !value.trim()) return;

                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'pdf-lab-section';

                const labelDiv = document.createElement('div');
                labelDiv.className = 'pdf-lab-label';
                labelDiv.textContent = label;

                const contentDiv = document.createElement('div');
                contentDiv.style.paddingLeft = '5px';
                contentDiv.style.whiteSpace = 'pre-wrap'; // Fix per invio a capo
                contentDiv.innerHTML = Parser.markdown(value);

                sectionDiv.appendChild(labelDiv);
                sectionDiv.appendChild(contentDiv);
                container.appendChild(sectionDiv);
            };

            createSection("Obiettivi:", UI.labInputs.objectives.value);
            createSection("Materiali:", UI.labInputs.materials.value);
            createSection("Strumenti e Hardware:", UI.labInputs.tools.value);
            createSection("Software:", UI.labInputs.software.value);
            createSection("Descrizione Attività:", UI.labInputs.description.value);
            createSection("Analisi e Calcoli:", UI.labInputs.calculations.value);


            // Render Charts
            if (State.charts.length > 0) {
                const chartsWrapper = document.createElement('div');
                this.renderCharts(chartsWrapper);
                container.appendChild(chartsWrapper);
            }

            // Render Circuit Diagram (Beta)
            if (window.CircuitEditor) {
                const circuitImg = CircuitEditor.getImage();
                if (circuitImg) {
                    const sectionDiv = document.createElement('div');
                    sectionDiv.className = 'pdf-lab-section';
                    sectionDiv.innerHTML = '<div class="pdf-lab-label">Schema Elettrico:</div>';
                    const img = document.createElement('img');
                    img.src = circuitImg;
                    img.style.maxWidth = '100%';
                    img.style.marginTop = '10px';
                    img.style.border = '1px solid rgba(255,255,255,0.1)';
                    img.style.borderRadius = '4px';
                    sectionDiv.appendChild(img);
                    container.appendChild(sectionDiv);
                }
            }

            // Trigger MathJax if needed (v2 style)
            if (window.MathJax && window.MathJax.Hub) {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, container]);
            }
        },

        renderFiles(mode) {
            UI.preview.codeContainer.innerHTML = '';

            if (mode === 'code' || mode === 'plc') {

                // Extra header for PLC
                if (mode === 'plc') {
                    const plcInfo = document.createElement('div');
                    plcInfo.className = 'pdf-lab-section';
                    plcInfo.style.marginBottom = '20px';
                    plcInfo.innerHTML = `
                        <div class="pdf-lab-label">Dettagli PLC:</div>
                        <div style="padding-left: 5px;">
                            <strong>CPU:</strong> ${UI.plcInputs.cpu.value || 'N/A'} <br>
                            <strong>Ambiente:</strong> ${UI.plcInputs.env.value || 'N/A'}
                        </div>
                     `;
                    UI.preview.codeContainer.appendChild(plcInfo);
                }

                State.files.forEach(file => {
                    const fileBlock = document.createElement('div');
                    fileBlock.style.marginBottom = '25px';

                    // Intestazione File
                    const header = document.createElement('div');
                    header.className = 'pdf-lab-label';
                    header.style.fontSize = '0.8rem';
                    header.style.color = '#94a3b8';
                    header.textContent = `File: ${file.name}`;
                    fileBlock.appendChild(header);

                    // Blocco Codice
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    // Use 'clike' or 'c' which is close enough for simple ST/SCL highlighting if specific one missing
                    code.className = mode === 'plc' ? 'language-pascal' : 'language-c';
                    // Note: Prism usually needs 'pascal' for ST-like syntax, falling back to C if not available or just text.
                    // Since we only loaded c, we stick to c or plain. Let's use 'diff' or 'c' for now.
                    code.className = 'language-c';
                    code.textContent = file.content;

                    pre.appendChild(code);
                    fileBlock.appendChild(pre);
                    UI.preview.codeContainer.appendChild(fileBlock);

                    if (window.Prism) Prism.highlightElement(code);
                });
                UI.preview.codeContainer.classList.remove('hidden');
            } else {
                UI.preview.codeContainer.classList.add('hidden');
            }
        },


        renderFlowchart(mode) {
            const container = UI.preview.flowchartContainer || document.getElementById('pdf-flowchart-container');
            if (!container) return;
            container.innerHTML = '';

            const code = UI.inputs.flowchart.value.trim();

            if (mode === 'flowchart' && code) {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'pdf-flowchart-section';

                const label = document.createElement('div');
                label.className = 'pdf-lab-label';
                label.textContent = "Diagramma di Flusso:";
                sectionDiv.appendChild(label);

                // Create canvas for flowchart
                const canvasDiv = document.createElement('div');
                canvasDiv.id = 'flowchart-canvas-' + Date.now();
                canvasDiv.style.textAlign = 'center';
                canvasDiv.style.padding = '20px';
                canvasDiv.style.backgroundColor = '#1e293b';

                sectionDiv.appendChild(canvasDiv);
                container.appendChild(sectionDiv);
                container.classList.remove('hidden');

                // Render with Flowchart.js
                setTimeout(() => {
                    try {
                        if (window.flowchart) {
                            const diagram = flowchart.parse(code);
                            diagram.drawSVG(canvasDiv.id, {
                                'x': 0,
                                'y': 0,
                                'line-width': 2,
                                'line-length': 50,
                                'text-margin': 10,
                                'font-size': 14,
                                'font-color': '#e2e8f0',
                                'line-color': '#38bdf8',
                                'element-color': '#1e293b',
                                'fill': '#334155',
                                'yes-text': 'Si',
                                'no-text': 'No',
                                'arrow-end': 'block',
                                'scale': 1,
                                'symbols': {
                                    'start': { 'font-color': '#e2e8f0', 'element-color': '#059669', 'fill': '#059669' },
                                    'end': { 'font-color': '#e2e8f0', 'element-color': '#dc2626', 'fill': '#dc2626' }
                                }
                            });
                        }
                    } catch (error) {
                        console.error("Flowchart error:", error);
                        canvasDiv.innerHTML = '<div style="color: #ef4444; padding: 20px;"><strong>Errore Sintassi Flowchart</strong><br>' + error.message + '</div>';
                    }
                }, 100);

            } else {
                container.classList.add('hidden');
            }
        },


        renderScreenshots() {
            // Check if screenshots exist
            if (State.screenshots.length > 0) {
                UI.preview.screenshotsContainer.classList.remove('hidden');
                UI.preview.screenshotsGrid.innerHTML = '';

                // Applica il layout scelto (1, 2 o 3 colonne)
                UI.preview.screenshotsGrid.style.display = 'grid';
                UI.preview.screenshotsGrid.style.gridTemplateColumns = `repeat(${State.screenshotLayout}, 1fr)`;
                UI.preview.screenshotsGrid.style.gap = '15px';

                State.screenshots.forEach(img => {
                    const card = document.createElement('div');
                    card.className = 'pdf-screenshot-card';
                    card.innerHTML = `
                         <img src="${img.src}" class="pdf-screenshot-img">
                         <div class="pdf-screenshot-caption">${img.caption || ''}</div>
                     `;
                    UI.preview.screenshotsGrid.appendChild(card);
                });
            } else {
                UI.preview.screenshotsContainer.classList.add('hidden');
            }
        },

        renderCharts(container) {
            // container is the element to append charts to
            State.charts.forEach(chart => {
                if (!chart.csvData) return;
                const rows = chart.csvData.trim().split('\n');
                if (!rows[0]) return;

                const section = document.createElement('div');
                section.className = 'pdf-lab-section';

                let tableHtml = `<div class="pdf-lab-label">Dati Sperimentali (${chart.yLabel}):</div><div class="table-wrapper"><table class="pdf-data-table"><thead><tr>`;
                tableHtml += `<th style="text-align:center;">${chart.xLabel || 'X'}</th><th style="text-align:center;">${chart.yLabel || 'Y'}</th></tr></thead><tbody>`;

                const dataPoints = [];
                rows.forEach(r => {
                    const pts = r.split(',').map(p => p.trim());
                    if (pts.length >= 2) {
                        dataPoints.push({ x: pts[0], y: pts[1] });
                        tableHtml += `<tr><td style="text-align:center;">${pts[0]}</td><td style="text-align:center;">${pts[1]}</td></tr>`;
                    }
                });
                tableHtml += `</tbody></table></div>`;
                section.innerHTML = tableHtml;

                const gTitle = document.createElement('div');
                gTitle.className = 'pdf-lab-label';
                gTitle.style.marginTop = '20px';
                gTitle.textContent = 'Grafico:';
                section.appendChild(gTitle);

                const box = document.createElement('div');
                box.className = 'chart-box';
                const canvas = document.createElement('canvas');
                canvas.id = `chart-${chart.id}`;
                box.appendChild(canvas);
                section.appendChild(box);

                container.appendChild(section);

                if (window.Chart) {
                    setTimeout(() => {
                        if (State.activeCharts[chart.id]) State.activeCharts[chart.id].destroy();
                        const ctx = canvas.getContext('2d');
                        State.activeCharts[chart.id] = new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: dataPoints.map(d => d.x),
                                datasets: [{
                                    label: chart.yLabel,
                                    data: dataPoints.map(d => d.y),
                                    borderColor: '#38bdf8',
                                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                    borderWidth: 2,
                                    tension: 0.3,
                                    fill: true
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                                }
                            }
                        });
                    }, 50);
                }
            });
        }
    };

    // ==========================================
    // 6.5 CIRCUIT EDITOR
    // ==========================================
    const CircuitEditor = {
        canvas: null,
        ctx: null,
        width: 800,
        height: 400,
        gridSize: 20,
        components: [],
        wires: [], // Array of {x1, y1, x2, y2}
        selectedId: null,
        hoverId: null, // NEW: Track hovered component
        tool: 'select',
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        tempWire: null,

        init() {
            this.canvas = document.getElementById('circuit-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');

            // Pointer Events (Support touch & mouse)
            this.canvas.addEventListener('pointerdown', (e) => this.onMouseDown(e));
            window.addEventListener('pointermove', (e) => this.onMouseMove(e));
            window.addEventListener('pointerup', (e) => this.onMouseUp(e));
            this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

            // Fix for touch scrolling while drawing
            this.canvas.style.touchAction = 'none';

            // Keyboard Events (Delete/Canc key)
            window.addEventListener('keydown', (e) => {
                // If we are typing in an input/textarea, don't delete circuit components
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                if (e.key === 'Delete' || e.key === 'Backspace') {
                    this.deleteSelected();
                }
            });

            // Toolbar & Dropdowns
            document.querySelectorAll('.circuit-tool').forEach(btn => {
                btn.onclick = (e) => {
                    if (btn.classList.contains('dropdown-trigger')) {
                        const menu = btn.parentElement.querySelector('.circuit-submenu');
                        const isVisible = menu.classList.contains('show');
                        document.querySelectorAll('.circuit-submenu').forEach(m => m.classList.remove('show'));
                        if (!isVisible) menu.classList.add('show');
                        e.stopPropagation();
                        return;
                    }

                    document.querySelectorAll('.circuit-tool').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.tool = btn.dataset.tool;
                    document.querySelectorAll('.circuit-submenu').forEach(m => m.classList.remove('show'));

                    const status = document.getElementById('circuit-status');
                    if (status) status.textContent = 'Strumento: ' + (btn.title || this.tool);
                };
            });

            document.querySelectorAll('.submenu-item').forEach(item => {
                item.onclick = (e) => {
                    const container = item.closest('.circuit-dropdown-container');
                    const trigger = container.querySelector('.dropdown-trigger');
                    document.querySelectorAll('.circuit-tool').forEach(b => b.classList.remove('active'));
                    trigger.classList.add('active');
                    this.tool = item.dataset.tool;
                    container.querySelector('.circuit-submenu').classList.remove('show');

                    const status = document.getElementById('circuit-status');
                    if (status) status.textContent = 'Strumento: ' + item.textContent;
                    e.stopPropagation();
                };
            });

            window.addEventListener('click', () => {
                document.querySelectorAll('.circuit-submenu').forEach(m => m.classList.remove('show'));
            });

            // Actions
            const btnClear = document.getElementById('circuit-clear');
            if (btnClear) btnClear.addEventListener('click', () => {
                if (confirm("Cancellare tutto il circuito?")) {
                    this.components = [];
                    this.wires = [];
                    this.draw();
                    Renderer.updateAll();
                }
            });

            const btnDelete = document.getElementById('circuit-delete');
            if (btnDelete) btnDelete.addEventListener('click', () => {
                this.deleteSelected();
            });

            const btnRotate = document.getElementById('circuit-rotate');
            if (btnRotate) btnRotate.addEventListener('click', () => {
                if (this.selectedId) {
                    const c = this.components.find(x => x.id === this.selectedId);
                    if (c) {
                        c.rotation = (c.rotation + 90) % 360;
                        this.draw();
                        Renderer.updateAll();
                    }
                }
            });

            // Initial Draw
            this.draw();
        },

        deleteSelected() {
            if (this.selectedId) {
                this.components = this.components.filter(c => c.id !== this.selectedId);
                this.wires = this.wires.filter(w => w.id !== this.selectedId);
                this.selectedId = null;
                this.draw();
                if (window.Renderer) Renderer.updateAll();
                else if (window.Render) Render.updateAll();
            }
        },

        getMousePos(evt) {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            };
        },

        snap(val) {
            return Math.round(val / this.gridSize) * this.gridSize;
        },

        getComponentTerminals(c) {
            const rad = (c.rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const getPos = (lx, ly) => {
                return {
                    x: c.x + lx * cos - ly * sin,
                    y: c.y + lx * sin + ly * cos
                };
            };

            const type = c.type;
            const pts = [];

            if (type === 'potentiometer') {
                pts.push(getPos(-20, 0), getPos(20, 0), getPos(0, -20));
            } else if (['resistor', 'capacitor', 'inductor', 'diode', 'led', 'diode-led', 'diode-zener', 'diode-schottky', 'diode-photo', 'diode-tvs', 'varactor', 'battery', 'acsource', 'bulb', 'switch', 'voltmeter', 'ammeter', 'multimeter', 'scr', 'diac', 'triac'].includes(type)) {
                let d = 20;
                if (['capacitor', 'inductor', 'battery', 'acsource', 'switch', 'diode', 'led', 'diode-led', 'diode-zener', 'diode-schottky', 'diode-photo', 'diode-tvs', 'varactor', 'scr', 'diac', 'triac'].includes(type)) d = 15;
                pts.push(getPos(-d, 0), getPos(d, 0));

                // Extra pin for SCR/TRIAC
                if (type === 'scr') pts.push(getPos(-10, 15));
                if (type === 'triac') pts.push(getPos(10, 15));
            } else if (type === 'transistor-npn' || type === 'transistor-pnp' || type === 'mosfet-n' || type === 'mosfet-p') {
                pts.push(getPos(-15, 0), getPos(10, -15), getPos(10, 15));
            } else if (type === 'opamp') {
                pts.push(getPos(-15, -10), getPos(-15, 10), getPos(15, 0));
            } else if (type === 'ground') {
                pts.push(getPos(0, -10));
            } else if (type === 'oscilloscope' || type === 'powersupply' || type === 'funcgen') {
                pts.push(getPos(-20, 0), getPos(20, 0));
            } else if (type === 'diode-bridge') {
                pts.push(getPos(-15, 0), getPos(15, 0), getPos(0, -15), getPos(0, 15));
            }
            return pts;
        },

        getWireSegments(w) {
            // Calcolo percorso automatico ortogonale (Manhattan routing)
            const segments = [{ x: w.x1, y: w.y1 }];

            // Se i punti sono quasi allineati, usiamo un solo angolo
            // Altrimenti un percorso a Z (scartamento a metà)
            if (Math.abs(w.x1 - w.x2) < 5 || Math.abs(w.y1 - w.y2) < 5) {
                segments.push({ x: w.x2, y: w.y2 });
            } else {
                // Utilizza midX personalizzato se presente, altrimenti calcola la metà
                const midX = (w.midX !== undefined) ? w.midX : (w.x1 + (w.x2 - w.x1) / 2);
                segments.push({ x: midX, y: w.y1 });
                segments.push({ x: midX, y: w.y2 });
                segments.push({ x: w.x2, y: w.y2 });
            }
            return segments;
        },

        onMouseDown(e) {
            if (e.target !== this.canvas) return;
            const pos = this.getMousePos(e);

            // 1. PRIORITÀ SELEZIONE CENTRALE (Se clicco al centro, voglio selezionare, non cablare)
            if (this.tool === 'select') {
                // 1. PRIORITÀ MANIGLIE FILO (Se un filo è già selezionato)
                if (this.selectedId) {
                    const selWire = this.wires.find(w => w.id === this.selectedId);
                    if (selWire) {
                        const segments = this.getWireSegments(selWire);
                        for (let i = 0; i < segments.length; i++) {
                            const p = segments[i];
                            if (Math.abs(p.x - pos.x) < 15 && Math.abs(p.y - pos.y) < 15) {
                                this.isDragging = true;
                                this.dragType = 'wire-handle';
                                this.dragHandleIdx = i;
                                this.draw();
                                return;
                            }
                        }
                    }
                }

                // 2. PRIORITÀ COMPONENTI (Hit-box accurata basata sulla rotazione)
                const clickedComp = this.components.find(c => {
                    const dx = pos.x - c.x;
                    const dy = pos.y - c.y;
                    // Se ruotato di 90 o 270, scambiamo i limiti X/Y
                    const isVert = (c.rotation / 90) % 2 !== 0;
                    const bw = isVert ? 15 : 20;
                    const bh = isVert ? 20 : 15;
                    return Math.abs(dx) < bw && Math.abs(dy) < bh;
                });

                if (clickedComp) {
                    this.dragType = 'component';
                    this.selectedId = clickedComp.id;
                    this.isDragging = true;
                    this.dragStart = { x: pos.x - clickedComp.x, y: pos.y - clickedComp.y };
                    this.draw();
                    return;
                }

                // 3. SELEZIONE FILI
                const clickedWire = this.wires.find(w => {
                    const segments = this.getWireSegments(w);
                    for (let i = 0; i < segments.length - 1; i++) {
                        if (this.distToSegment(pos, segments[i], segments[i + 1]) < 8) return true;
                    }
                    return false;
                });
                if (clickedWire) {
                    this.selectedId = clickedWire.id;
                    this.dragType = 'wire';
                    this.draw();
                    return;
                }

                this.selectedId = null;
                this.draw();
                return;
            }

            // 2. SMART TERMINAL CHECK (PRIORITY PER I CAVI SE NON HO CLICCATO AL CENTRO)
            if (this.tool === 'select' || this.tool === 'wire') {
                let nearestTerminal = null;
                let minDist = 15;
                this.components.forEach(c => {
                    this.getComponentTerminals(c).forEach(t => {
                        const d = Math.sqrt(Math.pow(t.x - pos.x, 2) + Math.pow(t.y - pos.y, 2));
                        if (d < minDist) {
                            minDist = d;
                            nearestTerminal = t;
                        }
                    });
                });

                if (nearestTerminal) {
                    this.tool = 'wire';
                    this.isDragging = true;
                    this.tempWire = {
                        x1: nearestTerminal.x,
                        y1: nearestTerminal.y,
                        x2: nearestTerminal.x,
                        y2: nearestTerminal.y
                    };

                    document.querySelectorAll('.circuit-tool').forEach(b => b.classList.remove('active'));
                    const wireBtn = document.querySelector('[data-tool="wire"]');
                    if (wireBtn) wireBtn.classList.add('active');

                    this.draw();
                    return;
                }
            }

            if (this.tool === 'wire') {
                this.isDragging = true;
                this.tempWire = { x1: this.snap(pos.x), y1: this.snap(pos.y), x2: this.snap(pos.x), y2: this.snap(pos.y) };
            } else {
                // Place component - Evita duplicati nella stessa posizione
                const snapX = this.snap(pos.x);
                const snapY = this.snap(pos.y);
                const exists = this.components.find(c => c.x === snapX && c.y === snapY);
                if (exists) {
                    this.selectedId = exists.id;
                    this.draw();
                    return;
                }

                const newComp = {
                    id: Date.now(),
                    type: this.tool,
                    x: snapX,
                    y: snapY,
                    rotation: 0
                };
                if (this.tool === 'text') {
                    const t = prompt("Testo per etichetta:", "V1");
                    if (t) newComp.text = t;
                    else return;
                }
                this.components.push(newComp);
                // Switch back to select tool - RIMOSSO per comodità utente (permette di piazzare più componenti)

                this.draw();
                Renderer.updateAll(); // Update preview
            }
        },

        onMouseMove(e) {
            const pos = this.getMousePos(e);

            // Hover detection per componenti (anch'essa rotation-aware)
            const hoveredComp = this.components.find(c => {
                const isVert = (c.rotation / 90) % 2 !== 0;
                const bw = isVert ? 15 : 25;
                const bh = isVert ? 25 : 15;
                return Math.abs(c.x - pos.x) < bw && Math.abs(c.y - pos.y) < bh;
            });
            const hoveredWire = hoveredComp ? null : this.wires.find(w => {
                const segments = this.getWireSegments(w);
                for (let i = 0; i < segments.length - 1; i++) {
                    if (this.distToSegment(pos, segments[i], segments[i + 1]) < 8) return true;
                }
                return false;
            });

            // Hover detection per terminali
            let hoveredTerminal = false;
            if (this.tool === 'select' || this.tool === 'wire') {
                this.components.forEach(c => {
                    this.getComponentTerminals(c).forEach(t => {
                        const d = Math.sqrt(Math.pow(t.x - pos.x, 2) + Math.pow(t.y - pos.y, 2));
                        if (d < 15) hoveredTerminal = true;
                    });
                });
            }

            const hovered = hoveredComp || hoveredWire || hoveredTerminal;
            const newHoverId = (hoveredComp || hoveredWire) ? (hoveredComp || hoveredWire).id : null;

            if (this.hoverId !== newHoverId || this.lastHoveredTerminal !== hoveredTerminal) {
                this.hoverId = newHoverId;
                this.lastHoveredTerminal = hoveredTerminal;

                if (hoveredTerminal) {
                    this.canvas.style.cursor = 'crosshair';
                } else if (hovered) {
                    this.canvas.style.cursor = 'pointer';
                } else {
                    this.canvas.style.cursor = (this.tool === 'wire') ? 'crosshair' : 'default';
                }
                this.draw();
            }

            if (!this.isDragging) return;

            if (this.tool === 'select' && this.selectedId) {
                if (this.dragType === 'wire-handle') {
                    const w = this.wires.find(x => x.id === this.selectedId);
                    if (w) {
                        const newX = this.snap(pos.x);
                        const newY = this.snap(pos.y);

                        if (this.dragHandleIdx === 0) { // Start
                            w.x1 = newX; w.y1 = newY;
                        } else if (this.dragHandleIdx === 3 || (this.dragHandleIdx === 1 && Math.abs(w.x1 - w.x2) < 5)) { // End
                            w.x2 = newX; w.y2 = newY;
                        } else { // One of the mid corners
                            w.midX = newX;
                        }
                        this.draw();
                    }
                } else {
                    // Dragging component
                    const c = this.components.find(x => x.id === this.selectedId);
                    if (c) {
                        c.x = this.snap(pos.x - this.dragStart.x);
                        c.y = this.snap(pos.y - this.dragStart.y);
                        this.draw();
                    }
                }
            } else if (this.tool === 'wire' && this.tempWire) {
                // ANTEPRIMA CON AGGANCIO REALE (Snap ai terminali durante il movimento)
                let nearest = null;
                this.components.forEach(comp => {
                    this.getComponentTerminals(comp).forEach(t => {
                        const d = Math.sqrt(Math.pow(t.x - pos.x, 2) + Math.pow(t.y - pos.y, 2));
                        if (d < 15) nearest = t;
                    });
                });

                if (nearest) {
                    this.tempWire.x2 = nearest.x;
                    this.tempWire.y2 = nearest.y;
                } else {
                    this.tempWire.x2 = this.snap(pos.x);
                    this.tempWire.y2 = this.snap(pos.y);
                }
                this.draw();
            }
        },

        onMouseUp(e) {
            if (this.isDragging) {
                if (this.tool === 'wire' && this.tempWire) {
                    if (this.tempWire.x1 !== this.tempWire.x2 || this.tempWire.y1 !== this.tempWire.y2) {
                        // SMART END SNAPPING
                        let nearestEnd = null;
                        this.components.forEach(c => {
                            this.getComponentTerminals(c).forEach(t => {
                                const d = Math.sqrt(Math.pow(t.x - this.tempWire.x2, 2) + Math.pow(t.y - this.tempWire.y2, 2));
                                if (d < 15) nearestEnd = t;
                            });
                        });
                        if (nearestEnd) {
                            this.tempWire.x2 = nearestEnd.x;
                            this.tempWire.y2 = nearestEnd.y;
                        }
                        this.wires.push({ ...this.tempWire, id: Date.now() });
                    }
                    this.tempWire = null;
                    Renderer.updateAll();
                } else if (this.tool === 'select') {
                    Renderer.updateAll();
                }
                this.isDragging = false;
                this.draw();
            }
        },

        onDoubleClick(e) {
            const pos = this.getMousePos(e);
            const clickedComp = this.components.find(c => Math.abs(c.x - pos.x) < 30 && Math.abs(c.y - pos.y) < 30);
            if (clickedComp) {
                clickedComp.rotation = (clickedComp.rotation + 90) % 360;
                this.draw();
                Renderer.updateAll();
            }
        },

        draw() {
            if (!this.ctx) return;
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Wires
            this.wires.forEach(w => {
                const segments = this.getWireSegments(w);
                const isSelected = w.id === this.selectedId;
                const isHovered = w.id === this.hoverId;

                this.ctx.beginPath();
                this.ctx.strokeStyle = isSelected ? '#38bdf8' : (isHovered ? '#f8fafc' : '#94a3b8');
                this.ctx.lineWidth = (isSelected || isHovered) ? 3 : 2;

                this.ctx.moveTo(segments[0].x, segments[0].y);
                for (let i = 1; i < segments.length; i++) {
                    this.ctx.lineTo(segments[i].x, segments[i].y);
                }
                this.ctx.stroke();

                // Draw Junctions
                this.drawJunction(w.x1, w.y1);
                this.drawJunction(w.x2, w.y2);

                // DRAW HANDLES if selected (like in the user photo)
                if (isSelected) {
                    this.ctx.fillStyle = '#38bdf8';
                    segments.forEach(p => {
                        this.ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
                    });
                }
            });

            if (this.tempWire) {
                const segments = this.getWireSegments(this.tempWire);
                this.ctx.beginPath();
                this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
                this.ctx.setLineDash([5, 5]);
                this.ctx.moveTo(segments[0].x, segments[0].y);
                for (let i = 1; i < segments.length; i++) {
                    this.ctx.lineTo(segments[i].x, segments[i].y);
                }
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }

            // Components
            this.components.forEach(c => {
                this.ctx.save();
                this.ctx.translate(c.x, c.y);
                this.ctx.rotate((c.rotation * Math.PI) / 180);

                const isSelected = c.id === this.selectedId;
                const isHovered = c.id === this.hoverId;

                if (isSelected || isHovered) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.3)';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.setLineDash([4, 4]);

                    // Calcola box dinamico basato sul tipo di componente
                    let bw = 22, bh = 18;
                    if (['resistor', 'potentiometer', 'diode', 'led', 'switch'].includes(c.type)) {
                        bw = 25; bh = 12;
                    } else if (['oscilloscope', 'powersupply', 'funcgen'].includes(c.type)) {
                        bw = 25; bh = 20;
                    }

                    this.ctx.strokeRect(-bw, -bh, bw * 2, bh * 2);
                    this.ctx.setLineDash([]);
                }

                this.drawComponent(c.type, c, isSelected ? '#38bdf8' : '#f8fafc');
                this.ctx.restore();
            });

            // Visual guide: Draw terminal points when in wire mode
            if (this.tool === 'wire') {
                this.components.forEach(c => {
                    this.getComponentTerminals(c).forEach(t => {
                        this.ctx.beginPath();
                        this.ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
                        this.ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
                        this.ctx.fill();
                    });
                });
            }
        },

        drawComponent(type, c, color = '#f8fafc') {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();

            if (type === 'resistor' || type === 'potentiometer') {
                // Resistor body aligned to 20px grid (total width 40, from -20 to 20)
                this.ctx.moveTo(-20, 0);
                this.ctx.lineTo(-16, -5);
                this.ctx.lineTo(-12, 5);
                this.ctx.lineTo(-8, -5);
                this.ctx.lineTo(-4, 5);
                this.ctx.lineTo(0, -5);
                this.ctx.lineTo(4, 5);
                this.ctx.lineTo(8, -5);
                this.ctx.lineTo(12, 5);
                this.ctx.lineTo(16, -5);
                this.ctx.lineTo(20, 0);
                this.ctx.stroke();

                if (type === 'potentiometer') {
                    // Wiper arrow (from top)
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -18);
                    this.ctx.lineTo(0, -6);
                    // Arrow head
                    this.ctx.lineTo(-3, -10);
                    this.ctx.moveTo(0, -6);
                    this.ctx.lineTo(3, -10);
                    this.ctx.stroke();
                }
            } else if (type === 'capacitor') {
                this.ctx.moveTo(-4, -10); this.ctx.lineTo(-4, 10);
                this.ctx.moveTo(4, -10); this.ctx.lineTo(4, 10);
                this.ctx.moveTo(-15, 0); this.ctx.lineTo(-4, 0);
                this.ctx.moveTo(4, 0); this.ctx.lineTo(15, 0);
                this.ctx.stroke();
            } else if (type === 'inductor') {
                this.ctx.moveTo(-15, 0);
                for (let i = 0; i < 3; i++) {
                    this.ctx.arc(-10 + i * 8, 0, 4, Math.PI, 0, false);
                }
                this.ctx.stroke();
            } else if (type === 'diode' || type === 'led' || type === 'diode-led' || type === 'diode-zener' || type === 'diode-schottky' || type === 'diode-photo' || type === 'diode-tvs' || type === 'varactor') {
                this.ctx.moveTo(-10, -7); this.ctx.lineTo(-10, 7); this.ctx.lineTo(5, 0); this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(5, -7); this.ctx.lineTo(5, 7);
                if (type === 'diode-zener' || type === 'diode-tvs') {
                    this.ctx.lineTo(8, 7);
                    this.ctx.moveTo(5, -7); this.ctx.lineTo(2, -7);
                    if (type === 'diode-tvs') { // Double sided for TVS
                        this.ctx.moveTo(-10, -7); this.ctx.lineTo(-13, -7);
                        this.ctx.moveTo(-10, 7); this.ctx.lineTo(-7, 7);
                    }
                } else if (type === 'diode-schottky') {
                    this.ctx.moveTo(2, -7); this.ctx.lineTo(5, -7); this.ctx.lineTo(5, 7); this.ctx.lineTo(8, 7);
                } else if (type === 'varactor') {
                    this.ctx.moveTo(8, -7); this.ctx.lineTo(8, 7);
                }
                this.ctx.stroke();
                if (type === 'led' || type === 'diode-led') {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -8); this.ctx.lineTo(-5, -13);
                    this.ctx.moveTo(5, -10); this.ctx.lineTo(0, -15);
                    this.ctx.stroke();
                } else if (type === 'diode-photo') {
                    this.ctx.beginPath();
                    this.ctx.moveTo(-5, -13); this.ctx.lineTo(0, -8);
                    this.ctx.moveTo(0, -15); this.ctx.lineTo(5, -10);
                    this.ctx.stroke();
                }
            } else if (type === 'scr') {
                this.ctx.moveTo(-10, -7); this.ctx.lineTo(-10, 7); this.ctx.lineTo(5, 0); this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.moveTo(5, -7); this.ctx.lineTo(5, 7);
                this.ctx.moveTo(-5, 5); this.ctx.lineTo(-10, 15); // Gate
                this.ctx.stroke();
            } else if (type === 'diac' || type === 'triac') {
                // Double diode
                this.ctx.moveTo(-5, 0); this.ctx.lineTo(5, -7); this.ctx.lineTo(5, 7); this.ctx.closePath();
                this.ctx.moveTo(5, 0); this.ctx.lineTo(-5, -7); this.ctx.lineTo(-5, 7); this.ctx.closePath();
                this.ctx.stroke();
                if (type === 'triac') {
                    this.ctx.moveTo(2, 5); this.ctx.lineTo(10, 15); // Gate
                    this.ctx.stroke();
                }
            } else if (type === 'diode-bridge') {
                this.ctx.rect(-15, -15, 30, 30);
                this.ctx.moveTo(-15, 0); this.ctx.lineTo(15, 0);
                this.ctx.moveTo(0, -15); this.ctx.lineTo(0, 15);
                this.ctx.stroke();
                this.ctx.font = '8px Arial';
                this.ctx.fillText('~', -12, 12);
                this.ctx.fillText('~', 8, -8);
                this.ctx.fillText('+', 8, 12);
                this.ctx.fillText('-', -12, -8);
            } else if (type === 'transistor-npn' || type === 'transistor-pnp') {
                this.ctx.moveTo(-5, -10); this.ctx.lineTo(-5, 10); // Base bar
                this.ctx.moveTo(-15, 0); this.ctx.lineTo(-5, 0); // Base wire
                this.ctx.moveTo(-5, -5); this.ctx.lineTo(10, -15); // Collector
                this.ctx.moveTo(-5, 5); this.ctx.lineTo(10, 15); // Emitter
                this.ctx.stroke();
                this.ctx.beginPath();
                if (type === 'transistor-npn') {
                    this.ctx.moveTo(2, 11); this.ctx.lineTo(10, 15); this.ctx.lineTo(7, 8);
                } else {
                    this.ctx.moveTo(0, 3); this.ctx.lineTo(-5, 5); this.ctx.lineTo(-3, 8);
                }
                this.ctx.stroke();
            } else if (type === 'mosfet-n' || type === 'mosfet-p') {
                this.ctx.moveTo(-5, -10); this.ctx.lineTo(-5, 10); // Gate bar
                this.ctx.moveTo(-15, 5); this.ctx.lineTo(-10, 5); // Gate wire (offset)
                this.ctx.moveTo(-10, -10); this.ctx.lineTo(-10, 10); // Channel bar
                this.ctx.moveTo(-10, -8); this.ctx.lineTo(10, -8); // Drain
                this.ctx.moveTo(-10, 8); this.ctx.lineTo(10, 8); // Source
                this.ctx.stroke();
                this.ctx.beginPath();
                if (type === 'mosfet-n') {
                    this.ctx.moveTo(-2, 8); this.ctx.lineTo(-10, 8); this.ctx.lineTo(-2, 5);
                } else {
                    this.ctx.moveTo(-10, 8); this.ctx.lineTo(-2, 8); this.ctx.moveTo(-10, 8); this.ctx.lineTo(-2, 11);
                }
                this.ctx.stroke();
            } else if (type === 'opamp') {
                this.ctx.moveTo(-15, -15); this.ctx.lineTo(-15, 15); this.ctx.lineTo(15, 0); this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.font = '10px Arial';
                this.ctx.fillText('-', -12, -5);
                this.ctx.fillText('+', -12, 10);
            } else if (type === 'battery') {
                this.ctx.moveTo(-3, -10); this.ctx.lineTo(-3, 10);
                this.ctx.moveTo(3, -5); this.ctx.lineTo(3, 5);
                this.ctx.stroke();
                this.ctx.moveTo(-15, 0); this.ctx.lineTo(-3, 0);
                this.ctx.moveTo(3, 0); this.ctx.lineTo(15, 0);
                this.ctx.stroke();
            } else if (type === 'acsource') {
                this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(-6, 0);
                this.ctx.bezierCurveTo(-3, -8, 3, 8, 6, 0);
                this.ctx.stroke();
            } else if (type === 'voltmeter' || type === 'ammeter' || type === 'multimeter') {
                this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                let label = 'V';
                if (type === 'ammeter') label = 'A';
                if (type === 'multimeter') label = 'M';
                this.ctx.fillText(label, 0, 5);
            } else if (type === 'oscilloscope') {
                this.ctx.rect(-20, -15, 40, 30);
                this.ctx.stroke();
                // Grid/Screen
                this.ctx.beginPath();
                this.ctx.setLineDash([2, 2]);
                this.ctx.moveTo(-15, 0); this.ctx.lineTo(15, 0);
                this.ctx.moveTo(0, -10); this.ctx.lineTo(0, 10);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                // Waveform
                this.ctx.beginPath();
                this.ctx.strokeStyle = '#22c55e'; // Green wave
                this.ctx.moveTo(-15, 5);
                this.ctx.bezierCurveTo(-7, -15, 7, 15, 15, -5);
                this.ctx.stroke();
                this.ctx.strokeStyle = '#f8fafc';
            } else if (type === 'funcgen') {
                this.ctx.rect(-20, -15, 40, 30);
                this.ctx.stroke();
                this.ctx.font = '8px Arial';
                this.ctx.fillText('FUNC', 0, -5);
                // Icons
                this.ctx.beginPath();
                this.ctx.moveTo(-12, 5); this.ctx.lineTo(-8, 5); this.ctx.lineTo(-8, 10); this.ctx.lineTo(-4, 10); // Square
                this.ctx.moveTo(4, 8); this.ctx.bezierCurveTo(7, 2, 11, 14, 14, 8); // Sine
                this.ctx.stroke();
            } else if (type === 'powersupply') {
                this.ctx.rect(-20, -15, 40, 30);
                this.ctx.stroke();
                this.ctx.font = 'bold 10px Arial';
                this.ctx.fillText('DC PS', 0, -2);
                this.ctx.font = '8px Arial';
                this.ctx.fillText('0-30V', 0, 8);
                // Terminals
                this.ctx.beginPath();
                this.ctx.arc(-10, 10, 2, 0, 2 * Math.PI);
                this.ctx.arc(10, 10, 2, 0, 2 * Math.PI);
                this.ctx.fill();
            } else if (type === 'bulb') {
                this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.moveTo(-7, -7); this.ctx.lineTo(7, 7);
                this.ctx.moveTo(7, -7); this.ctx.lineTo(-7, 7);
                this.ctx.stroke();
            } else if (type === 'switch') {
                this.ctx.moveTo(-15, 0); this.ctx.lineTo(-5, 0);
                this.ctx.lineTo(10, -10);
                this.ctx.moveTo(10, 0); this.ctx.lineTo(15, 0);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.arc(-5, 0, 2, 0, 2 * Math.PI);
                this.ctx.arc(10, 0, 2, 0, 2 * Math.PI);
                this.ctx.fill();
            } else if (type === 'ground') {
                this.ctx.moveTo(0, -10); this.ctx.lineTo(0, 0);
                this.ctx.moveTo(-10, 0); this.ctx.lineTo(10, 0);
                this.ctx.moveTo(-6, 4); this.ctx.lineTo(6, 4);
                this.ctx.moveTo(-2, 8); this.ctx.lineTo(2, 8);
                this.ctx.stroke();
            } else if (type === 'text') {
                this.ctx.font = '14px Arial';
                this.ctx.fillStyle = '#cbd5e1';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(c.text || 'Txt', 0, 5);
            }
        },

        getImage() {
            if (!this.components.length && !this.wires.length) return null;
            return this.canvas.toDataURL('image/png');
        },

        // Helper calculations
        distToSegment(p, v, w) {
            const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
            if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
            let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
        },

        drawJunction(x, y) {
            // Conta quante connessioni ci sono in questo punto esatto
            let connections = 0;
            const point = { x, y };

            // 1. Controlla estremità dei fili
            this.wires.forEach(w => {
                if ((w.x1 === x && w.y1 === y) || (w.x2 === x && w.y2 === y)) {
                    connections++;
                } else {
                    // Controlla se l'estremità di UN ALTRO filo tocca il CORPO di questo filo (T-junction)
                    const segments = this.getWireSegments(w);
                    for (let i = 0; i < segments.length - 1; i++) {
                        const dist = this.distToSegment(point, segments[i], segments[i + 1]);
                        if (dist < 2) { // Il punto è sul segmento
                            connections++;
                            break;
                        }
                    }
                }
            });

            // 2. Controlla terminali dei componenti
            this.components.forEach(c => {
                this.getComponentTerminals(c).forEach(t => {
                    if (Math.abs(t.x - x) < 3 && Math.abs(t.y - y) < 3) connections++;
                });
            });

            // Se ci sono più di 2 rami che si incontrano, disegna il punto di giunzione
            if (connections > 2) {
                this.ctx.beginPath();
                this.ctx.fillStyle = '#94a3b8';
                this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    };

    // ==========================================
    // 7. GESTORE EVENTI (Listeners)

    // ==========================================
    const Events = {
        init() {
            // Expose Renderer globally to fix potential external calls
            window.Render = Renderer;
            window.CircuitEditor = CircuitEditor;
            CircuitEditor.init();

            // Mermaid initial config removed (handled by flowchart.js or not needed)

            // Initial Mode Setup
            // Restore import button visibility based on stored/initial mode
            if (State.mode === 'plc' && UI.inputs.importPlcBtn) {
                UI.inputs.importPlcBtn.classList.remove('hidden');
            }

            // Create Debounced Update Function for heavy rendering
            const debouncedUpdate = Utils.debounce(() => {
                Renderer.updateAll();
            }, 300);

            // Navigazione
            UI.modes.btnCode.onclick = () => this.switchMode('code');
            UI.modes.btnLab.onclick = () => this.switchMode('lab');
            UI.modes.btnFlowchart.onclick = () => this.switchMode('flowchart');
            UI.modes.btnPlc.onclick = () => this.switchMode('plc');
            UI.screens.backToHome.onclick = () => {
                UI.screens.app.classList.add('hidden');
                UI.screens.home.classList.remove('hidden');
            };

            // Input Listeners
            const allInputs = [...Object.values(UI.inputs), ...Object.values(UI.labInputs), ...Object.values(UI.plcInputs)].filter(i => i instanceof HTMLElement);
            allInputs.forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                    if (el === UI.inputs.code) {
                        el.addEventListener('input', (e) => {
                            // Aggiorna subito lo stato interno per non perdere dati
                            FileManager.updateCurrentContent(e.target.value);
                            // Aggiorna l'anteprima con debounce
                            debouncedUpdate();
                        });
                    } else {
                        // Per tutti gli altri campi input
                        el.addEventListener('input', () => debouncedUpdate());
                    }
                    el.addEventListener('keydown', (e) => this.handleShortcuts(e));
                }
            });

            // Handlers Specifici
            UI.inputs.logo.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => { State.logoBase64 = ev.target.result; Renderer.updateAll(); };
                    reader.readAsDataURL(file);
                }
            };

            UI.inputs.addFileBtn.onclick = () => FileManager.addFile();
            UI.inputs.screenshotUpload.onchange = (e) => ScreenshotManager.add(e.target.files);
            UI.inputs.screenshotLayout.onchange = (e) => {
                State.screenshotLayout = e.target.value;
                Renderer.updateAll();
            };

            // Project Management Handlers
            UI.inputs.btnExport.onclick = () => ProjectManager.export();
            UI.inputs.btnImport.onclick = () => UI.inputs.importUpload.click();
            UI.inputs.importUpload.onchange = (e) => {
                if (e.target.files.length > 0) ProjectManager.import(e.target.files[0]);
                e.target.value = '';
            };

            // Toolbox Handlers
            UI.inputs.btnToolbox.onclick = () => Toolbox.toggle(true);
            UI.inputs.btnCloseToolbox.onclick = () => Toolbox.toggle(false);
            UI.inputs.btnCloseToolboxBtn.onclick = () => Toolbox.toggle(false);
            Toolbox.init();

            // PLC Import Handlers
            if (UI.inputs.importPlcBtn) {
                UI.inputs.importPlcBtn.onclick = () => UI.inputs.plcUpload.click();
            }
            if (UI.inputs.plcUpload) {
                UI.inputs.plcUpload.onchange = (e) => {
                    if (e.target.files.length > 0) {
                        FileManager.readPlcFile(e.target.files[0]);
                        e.target.value = ''; // Reset for next upload
                    }
                };
            }

            UI.labInputs.btnAddChart.onclick = () => {
                State.charts.push({ id: Date.now(), xLabel: '', yLabel: '', csvData: '' });
                this.renderChartInputs();
                Renderer.updateAll();
            };

            UI.btns.download.forEach(btn => {
                if (btn) btn.onclick = () => this.generatePDF();
            });

            // Info Modal
            UI.btns.info.onclick = () => this.toggleModal(true);
            UI.modal.close.forEach(btn => btn.onclick = () => this.toggleModal(false));
            UI.modal.overlay.onclick = (e) => { if (e.target === UI.modal.overlay) this.toggleModal(false); };
        },

        toggleModal(show) {
            if (show) {
                // Simplified help content loading
                let content = HelpContent.code;
                if (State.mode === 'lab') content = HelpContent.lab;
                if (State.mode === 'plc') content = HelpContent.plc;

                UI.modal.body.innerHTML = content + `
                    <div class="help-section">
                        <h4>📸 Screenshot & Flowchart</h4>
                        <p>Puoi caricare screenshot dei tuoi test o disegnare flowchart usando la sintassi flowchart.js.</p>
                    </div>`;
                UI.modal.overlay.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            } else {
                UI.modal.overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }
        },

        switchMode(mode) {
            State.mode = mode;
            UI.screens.home.classList.add('hidden');
            UI.screens.app.classList.remove('hidden');

            // Reset visibility
            UI.modes.editorSection.classList.add('hidden');
            UI.modes.labFields.classList.add('hidden');
            UI.modes.plcFields.classList.add('hidden');
            UI.modes.flowchartSection.classList.add('hidden');

            if (mode === 'lab') {
                UI.modes.title.textContent = "Lab Report Generator";
                UI.modes.subtitle.textContent = "Crea una relazione tecnica completa e professionale.";
                UI.modes.labFields.classList.remove('hidden');
            } else if (mode === 'flowchart') {
                UI.modes.title.textContent = "Flowchart Designer";
                UI.modes.subtitle.textContent = "Disegna diagrammi logici complessi con sintassi semplice.";
                UI.modes.flowchartSection.classList.remove('hidden');
            } else if (mode === 'plc') {
                UI.modes.title.textContent = "PLC Integrator";
                UI.modes.subtitle.textContent = "Environment Siemens/Schneider - Gestione Blocchi SCL/LAD.";
                UI.modes.plcFields.classList.remove('hidden');
                UI.modes.editorSection.classList.remove('hidden'); // Code editor is used for SCL
                if (UI.inputs.importPlcBtn) UI.inputs.importPlcBtn.classList.remove('hidden');
            } else {
                if (UI.inputs.importPlcBtn) UI.inputs.importPlcBtn.classList.add('hidden');
                UI.modes.title.textContent = "C Code Visualizer";
                UI.modes.subtitle.textContent = "Visualizza e stampa il tuo codice C con stile.";
                UI.modes.editorSection.classList.remove('hidden');
            }

            Storage.load(mode);
            this.renderChartInputs();
            Renderer.updateAll();
        },

        renderChartInputs() {
            UI.labInputs.chartsContainer.innerHTML = '';
            State.charts.forEach((chart, idx) => {
                const div = document.createElement('div');
                div.className = 'lab-data-section';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span class="section-title-small">Tabella e Grafico #${idx + 1}</span>
                        <button class="btn btn-secondary btn-sm" onclick="this.parentElement.parentElement.remove();" style="color:#ef4444;">Rimuovi</button>
                    </div>
                    <div class="customization-grid" style="grid-template-columns: 1fr 1fr; padding: 0;">
                        <div class="input-group">
                            <label>Asse X</label>
                            <input type="text" value="${chart.xLabel}" data-id="${chart.id}" class="c-xl">
                        </div>
                        <div class="input-group">
                            <label>Asse Y</label>
                            <input type="text" value="${chart.yLabel}" data-id="${chart.id}" class="c-yl">
                        </div>
                    </div>
                    <div class="input-group" style="margin-top:10px;">
                        <label>Dati (X, Y)</label>
                        <textarea data-id="${chart.id}" class="c-csv" rows="3">${chart.csvData}</textarea>
                    </div>
                `;

                div.querySelector('.c-xl').oninput = (e) => { chart.xLabel = e.target.value; Renderer.updateAll(); };
                div.querySelector('.c-yl').oninput = (e) => { chart.yLabel = e.target.value; Renderer.updateAll(); };
                div.querySelector('.c-csv').oninput = (e) => { chart.csvData = e.target.value; Renderer.updateAll(); };
                div.querySelector('.btn').onclick = () => {
                    State.charts = State.charts.filter(c => c.id !== chart.id);
                    this.renderChartInputs();
                    Renderer.updateAll();
                };

                UI.labInputs.chartsContainer.appendChild(div);
            });
        },

        handleShortcuts(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                const el = e.target;
                const s = el.selectionStart;
                const end = el.selectionEnd;
                const txt = el.value;
                el.value = txt.substring(0, s) + "**" + txt.substring(s, end) + "**" + txt.substring(end);
                el.selectionStart = el.selectionEnd = s + 2 + (end - s);
                Renderer.updateAll();
            }
            if (e.key === 'Tab' && e.target === UI.inputs.code) {
                e.preventDefault();
                const s = UI.inputs.code.selectionStart;
                UI.inputs.code.value = UI.inputs.code.value.substring(0, s) + "    " + UI.inputs.code.value.substring(s);
                UI.inputs.code.selectionStart = UI.inputs.code.selectionEnd = s + 4;
                // Important: Update State content on tab too
                FileManager.updateCurrentContent(UI.inputs.code.value);
                Renderer.updateAll();
            }
        },

        async generatePDF() {
            const btns = UI.btns.download;

            if (!window.html2canvas) {
                alert("Errore Critico: La libreria 'html2canvas' non è stata caricata. Ricarica la pagina.");
                return;
            }
            if (!window.jspdf) {
                alert("Errore Critico: La libreria 'jspdf' non è stata caricata. Ricarica la pagina.");
                return;
            }

            btns.forEach(b => { if (b) { b.disabled = true; b.textContent = "Generazione..."; } });

            try {
                await document.fonts.ready;
                await new Promise(r => setTimeout(r, 500));

                const title = prompt("Titolo file PDF:", UI.inputs.title.value) || "Documento";
                const element = document.querySelector('.pdf-page-mock');

                // Forza MathJax v2 a finire il rendering
                if (window.MathJax && window.MathJax.Hub) {
                    await new Promise(resolve => {
                        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, element], resolve);
                    });
                }

                // Attendi un attimo extra per la stabilità grafica
                await new Promise(r => setTimeout(r, 1000));

                window.scrollTo(0, 0);

                const canvas = await html2canvas(element, {
                    scale: 2,
                    backgroundColor: '#1e293b',
                    useCORS: true,
                    logging: false,
                    allowTaint: true, // Sometimes needed for mermaid/images
                    scrollY: -window.scrollY
                });

                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;

                const pdfWidth = 595;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                const pdf = new jsPDF({ unit: 'pt', format: [pdfWidth, pdfHeight] });

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
            } catch (e) {
                console.error("PDF Error:", e);
                alert("Ops! Errore generazione PDF. Dettagli: " + e.message);
            } finally {
                btns.forEach(b => { if (b) { b.disabled = false; b.textContent = "Scarica PDF"; } });
            }
        }
    };

    const HelpContent = {
        code: `
            <div class="help-section">
                <h4>💻 Software Developer Mode</h4>
                <p>Questa modalità è ottimizzata per presentare il tuo codice sorgente in modo ordinato e colorato.</p>
                <ul class="help-list">
                    <li><strong>📁 File Multipli:</strong> Clicca "+ Nuovo File" per aggiungere linguette. Puoi trascinarle per ordinarle!</li>
                    <li><strong>🖍️ Colori:</strong> Il codice viene colorato automaticamente usando lo standard C.</li>
                    <li><strong>🔍 Flowchart:</strong> Se scrivi nel campo "Flowchart", il programma disegnerà lo schema logico sotto al codice.</li>
                </ul>
                <p><em>Tip: Usa il tasto TAB nell'editor per indentare il codice correttamente.</em></p>
            </div>
        `,
        lab: `
            <div class="help-section">
                <h4>🧪 Lab Specialist Mode</h4>
                <p>Perfetta per le esercitazioni tecniche. Segui questi passaggi per una relazione da 10:</p>
                <ul class="help-list">
                    <li><strong>📝 Testo:</strong> Compila le sezioni (Obiettivi, Materiali, ecc.). Puoi usare <strong>**grassetto**</strong> con CTRL+B.</li>
                    <li><strong>🔢 Formule:</strong> Scrivi formule matematiche tra simboli del dollaro, es: <code>$E = mc^2$</code>.</li>
                    <li><strong>📈 Grafici & Tabelle:</strong> Clicca "Aggiungi Tabella/Grafico" e inserisci i dati separati da virgola (es: <code>1, 10</code>).</li>
                    <li><strong>⚡ Circuiti:</strong> Usa l'editor grafico per trascinare componenti e collegarli con i fili (clicca sui punti blu per spostarli).</li>
                </ul>
            </div>
        `,
        plc: `
            <div class="help-section">
                <h4>🏭 PLC Integrator</h4>
                <p>Progettata per chi lavora con TIA Portal, Step7 o Codesys.</p>
                <ul class="help-list">
                    <li><strong>📦 Importazione:</strong> Puoi caricare file XML o ST direttamente dal tuo software PLC.</li>
                    <li><strong>🎞️ Logica visiva:</strong> Carica screenshot del tuo codice Ladder (LAD) nella sezione Extra.</li>
                    <li><strong>⚙️ Hardware:</strong> Specifica sempre il modello di CPU e l'ambiente usato nell'intestazione.</li>
                </ul>
            </div>
        `
    };

    Events.init();
});
