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
        flowchartCode: '',     // Testo codice Mermaid
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
            screenshotList: document.getElementById('screenshots-list')
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
            this.renderTabs();
            // Restore content of active file to editor
            const activeFile = State.files.find(f => f.id === State.activeFileId);
            if (activeFile) UI.inputs.code.value = activeFile.content;
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
            if (currentFile) currentFile.content = UI.inputs.code.value;

            // Switch
            State.activeFileId = id;
            const newFile = State.files.find(f => f.id === id);
            if (newFile) UI.inputs.code.value = newFile.content;

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
            State.files.forEach(file => {
                const tab = document.createElement('div');
                tab.className = `file-tab ${file.id === State.activeFileId ? 'active' : ''}`;

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

                tab.onclick = () => {
                    if (file.id !== State.activeFileId) this.switchToFile(file.id);
                };

                UI.inputs.tabsBar.appendChild(tab);
            });
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
            State.screenshots.forEach(item => {
                const div = document.createElement('div');
                div.className = 'screenshot-preview-item';

                const img = document.createElement('img');
                img.src = item.src;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-screenshot';
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = () => this.remove(item.id);

                div.appendChild(img);
                div.appendChild(removeBtn);
                UI.inputs.screenshotList.appendChild(div);
            });
        }
    };

    // ==========================================
    // 5. GESTIONE DATI E MEMORIA (Storage)
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
                }
            } catch (e) { console.warn("Errore Storage (Quoto Exceeded?)", e); }
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
            return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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



            // Trigger MathJax if needed
            if (window.MathJax) {
                window.MathJax.typesetPromise([container]);
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
    // 7. GESTORE EVENTI (Listeners)
    // ==========================================
    const Events = {
        init() {
            // Expose Renderer globally to fix potential external calls
            window.Render = Renderer;

            // Mermaid initial config removed (handled by flowchart.js or not needed)

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
                <h4>💻 Informazioni Generali</h4>
                <p>Compila i dati dell'intestazione.</p>
                <ul class="help-list">
                    <li><strong>File Multipli:</strong> Usa "+ Nuovo File" per aggiungere tab.</li>
                    <li><strong>Flowchart:</strong> Usa la sintassi flowchart.js nel campo Extra.</li>
                </ul>
            </div>
        `,
        lab: `
            <div class="help-section">
                <h4>🧪 Relazione di Laboratorio</h4>
                <p>Campi specifici per esercitazioni.</p>
            </div>
        `,
        plc: `
            <div class="help-section">
                <h4>🏭 PLC Integrator</h4>
                <p>Specifica il modello della CPU e l'ambiente di sviluppo.</p>
                <ul class="help-list">
                    <li><strong>Codice:</strong> Incolla il sorgente SCL/ST nei tab.</li>
                    <li><strong>Screenshot:</strong> Carica immagini del Ladder (LAD) o FBD.</li>
                </ul>
            </div>
        `
    };

    Events.init();
});
