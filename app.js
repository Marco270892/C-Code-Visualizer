/**
 * PROGRAMMA PER SALVATAGGIO CODICE C E RELAZIONI DI LABORATORIO
 * Struttura Modulare per Massima Chiarezza
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
            btnCode: document.getElementById('mode-code'),
            btnLab: document.getElementById('mode-lab'),
            title: document.getElementById('app-type-title'),
            subtitle: document.getElementById('app-type-subtitle'),
            editorSection: document.querySelector('.editor-section'),
            labFields: document.getElementById('lab-details-fields')
        },
        // Campi di Inserimento (Shared)
        inputs: {
            title: document.getElementById('project-title'),
            school: document.getElementById('school-name'),
            student: document.getElementById('student-info'),
            date: document.getElementById('doc-date'),
            exercise: document.getElementById('exercise-text'),
            code: document.getElementById('code-input'),
            logo: document.getElementById('logo-upload'),
            logoStatus: document.getElementById('logo-status')
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
            codeSection: document.getElementById('code-output'),
            labSections: {
                objectives: [document.getElementById('pdf-lab-objectives-display'), document.getElementById('pdf-lab-objectives-container')],
                materials: [document.getElementById('pdf-lab-materials-display'), document.getElementById('pdf-lab-materials-container')],
                tools: [document.getElementById('pdf-lab-tools-display'), document.getElementById('pdf-lab-tools-container')],
                software: [document.getElementById('pdf-lab-software-display'), document.getElementById('pdf-lab-software-container')],
                description: [document.getElementById('pdf-lab-description-display'), document.getElementById('pdf-lab-description-container')],
                calculations: [document.getElementById('pdf-lab-calculations-display'), document.getElementById('pdf-lab-calculations-container')],
                charts: document.getElementById('pdf-dynamic-charts-container'),
                conclusions: [document.getElementById('pdf-lab-conclusions-display'), document.getElementById('pdf-lab-conclusions-container')]
            }
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

    // ==========================================
    // 3. CONTENUTI GUIDA (Help Content)
    // ==========================================
    const HelpContent = {
        code: `
            <div class="help-section">
                <h4>💻 Informazioni Generali</h4>
                <p>Compila i dati dell'intestazione per personalizzare il documento PDF.</p>
                <ul class="help-list">
                    <li><strong>Titolo Progetto:</strong> Verrà visualizzato in grande al centro.</li>
                    <li><strong>Scuola/Studente/Data:</strong> Appariranno nell'angolo in alto a destra.</li>
                    <li><strong>Logo:</strong> Carica un file immagine per aggiungerlo accanto all'intestazione.</li>
                </ul>
            </div>
            <div class="help-section">
                <h4>📝 Editor del Codice</h4>
                <p>Inserisci il tuo codice C nell'area dedicata.</p>
                <ul class="help-list">
                    <li>Premi <span class="code-tag">TAB</span> per indentare correttamente il codice.</li>
                    <li>Usa <span class="code-tag">CTRL + B</span> per evidenziare il testo in grassetto (funziona nei campi descrittivi).</li>
                </ul>
            </div>
        `,
        lab: `
            <div class="help-section">
                <h4>🧪 Relazione di Laboratorio</h4>
                <p>Questa modalità include campi specifici per documentare un'esercitazione tecnica.</p>
                <ul class="help-list">
                    <li><strong>Obiettivi e Materiali:</strong> Descrivi lo scopo e le risorse usate.</li>
                    <li><strong>Calcoli LaTeX:</strong> Puoi inserire formule matematiche usando il simbolo $, ad esempio <span class="code-tag">$E=mc^2$</span>.</li>
                </ul>
            </div>
            <div class="help-section">
                <h4>📊 Tabelle e Grafici</h4>
                <p>Aggiungi dati sperimentali per generare visualizzazioni professionali.</p>
                <ul class="help-list">
                    <li><strong>Formato Dati:</strong> Inserisci i valori separati da virgola (es: <span class="code-tag">10, 25</span>).</li>
                    <li><strong>Nuova Riga:</strong> Ogni riga del testo corrisponde a un punto nel grafico.</li>
                    <li>Puoi aggiungere più grafici cliccando sul pulsante dedicato.</li>
                </ul>
            </div>
        `
    };

    // ==========================================
    // 4. GESTIONE DATI E MEMORIA (Storage)
    // ==========================================
    const Storage = {
        save() {
            const mode = State.mode;
            const prefix = mode === 'code' ? 'c-' : 'l-';
            try {
                // Dati Comuni (Sempre condivisi)
                localStorage.setItem('shared-school', UI.inputs.school.value);
                localStorage.setItem('shared-student', UI.inputs.student.value);
                localStorage.setItem('shared-date', UI.inputs.date.value);
                localStorage.setItem('shared-logo', State.logoBase64 || '');

                // Dati Specifici
                localStorage.setItem(prefix + 'title', UI.inputs.title.value);
                localStorage.setItem(prefix + 'exercise', UI.inputs.exercise.value);
                localStorage.setItem(prefix + 'code', UI.inputs.code.value);

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
            } catch (e) { console.warn("Errore Storage", e); }
        },

        load(mode) {
            const prefix = mode === 'code' ? 'c-' : 'l-';

            // Carica Dati Comuni
            UI.inputs.school.value = localStorage.getItem('shared-school') || '';
            UI.inputs.student.value = localStorage.getItem('shared-student') || '';
            UI.inputs.date.value = localStorage.getItem('shared-date') || '';
            State.logoBase64 = localStorage.getItem('shared-logo') || null;

            // Carica Dati Specifici
            UI.inputs.title.value = localStorage.getItem(prefix + 'title') || (mode === 'code' ? 'Codice Sorgente C' : 'Relazione di Laboratorio');
            UI.inputs.exercise.value = localStorage.getItem(prefix + 'exercise') || '';
            UI.inputs.code.value = localStorage.getItem(prefix + 'code') || (mode === 'code' ? '/* Scrivi qui il tuo codice C */' : '');

            if (mode === 'lab') {
                UI.labInputs.objectives.value = localStorage.getItem(prefix + 'objectives') || '';
                UI.labInputs.materials.value = localStorage.getItem(prefix + 'materials') || '';
                UI.labInputs.tools.value = localStorage.getItem(prefix + 'tools') || '';
                UI.labInputs.software.value = localStorage.getItem(prefix + 'software') || '';
                UI.labInputs.description.value = localStorage.getItem(prefix + 'description') || '';
                UI.labInputs.calculations.value = localStorage.getItem(prefix + 'calculations') || '';
                UI.labInputs.conclusions.value = localStorage.getItem(prefix + 'conclusions') || '';

                const savedCharts = localStorage.getItem(prefix + 'charts-json');
                try {
                    State.charts = savedCharts ? JSON.parse(savedCharts) : [];
                } catch (e) { State.charts = []; }
            } else {
                State.charts = []; // Reset temporaneo per la preview
            }
        }
    };

    // ==========================================
    // 4. LOGICA DI VISUALIZZAZIONE (Preview)
    // ==========================================
    const Parser = {
        // Converte **testo** in grassetto HTML
        markdown(text) {
            if (!text) return "";
            return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }
    };

    const Renderer = {
        updateAll() {
            const mode = State.mode;

            // 1. Dati Comuni
            UI.preview.title.textContent = UI.inputs.title.value;
            UI.preview.school.textContent = UI.inputs.school.value;
            UI.preview.student.textContent = UI.inputs.student.value;

            if (UI.inputs.date.value) {
                const d = new Date(UI.inputs.date.value);
                UI.preview.date.textContent = d.toLocaleDateString('it-IT');
            } else { UI.preview.date.textContent = ""; }

            // 2. Logo
            UI.preview.logo.innerHTML = '';
            if (State.logoBase64) {
                const img = document.createElement('img');
                img.src = State.logoBase64;
                UI.preview.logo.appendChild(img);
                UI.inputs.logoStatus.textContent = "Caricato ✓";
                UI.inputs.logoStatus.style.color = "#38bdf8";
            } else {
                UI.inputs.logoStatus.textContent = "Mancante";
                UI.inputs.logoStatus.style.color = "";
            }

            // 3. Traccia/Esercizio
            if (UI.inputs.exercise.value.trim()) {
                UI.preview.exerciseDisplay.innerHTML = Parser.markdown(UI.inputs.exercise.value);
                UI.preview.exerciseContainer.classList.remove('hidden');
                if (window.MathJax) window.MathJax.typesetPromise([UI.preview.exerciseDisplay]);
            } else { UI.preview.exerciseContainer.classList.add('hidden'); }

            // 4. Sezioni Laboratorio
            if (mode === 'lab') {
                this.updateLabSection(UI.labInputs.objectives, UI.preview.labSections.objectives);
                this.updateLabSection(UI.labInputs.materials, UI.preview.labSections.materials);
                this.updateLabSection(UI.labInputs.tools, UI.preview.labSections.tools);
                this.updateLabSection(UI.labInputs.software, UI.preview.labSections.software);
                this.updateLabSection(UI.labInputs.description, UI.preview.labSections.description);
                this.updateLabSection(UI.labInputs.calculations, UI.preview.labSections.calculations);
                this.renderCharts();
                this.updateLabSection(UI.labInputs.conclusions, UI.preview.labSections.conclusions);
            } else {
                // Pulisci sezioni laboratorio se in modalità codice
                Object.values(UI.preview.labSections).forEach(item => {
                    if (Array.isArray(item)) item[1].classList.add('hidden');
                    else if (item instanceof HTMLElement) item.innerHTML = '';
                });
            }

            // 5. Sezione Codice
            if (mode === 'code') {
                UI.preview.codeSection.textContent = UI.inputs.code.value;
                Prism.highlightElement(UI.preview.codeSection);
                UI.preview.codeSection.parentElement.classList.remove('hidden');
            } else {
                UI.preview.codeSection.parentElement.classList.add('hidden');
            }

            Storage.save();
        },

        updateLabSection(input, previewPair) {
            const [display, container] = previewPair;
            if (input.value.trim()) {
                display.innerHTML = Parser.markdown(input.value);
                container.classList.remove('hidden');
                if (window.MathJax) window.MathJax.typesetPromise([display]);
            } else { container.classList.add('hidden'); }
        },

        renderCharts() {
            UI.preview.labSections.charts.innerHTML = '';
            State.charts.forEach(chart => {
                const rows = chart.csvData.trim().split('\n');
                if (!rows[0]) return;

                const section = document.createElement('div');
                section.className = 'pdf-lab-section';

                // Generazione Tabella
                let tableHtml = `<div class="pdf-lab-label">Dati Sperimentali:</div><div class="table-wrapper"><table class="pdf-data-table"><thead><tr>`;
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

                // Generazione Canvas Grafico
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

                UI.preview.labSections.charts.appendChild(section);

                // Inizializzazione Chart.js
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
    // 5. GESTORE EVENTI (Listeners)
    // ==========================================
    const Events = {
        init() {
            // Navigazione Menu Home
            UI.modes.btnCode.onclick = () => this.switchMode('code');
            UI.modes.btnLab.onclick = () => this.switchMode('lab');
            UI.screens.backToHome.onclick = () => {
                UI.screens.app.classList.add('hidden');
                UI.screens.home.classList.remove('hidden');
            };

            // Aggiornamento Campi Testo
            const allInputs = [...Object.values(UI.inputs), ...Object.values(UI.labInputs)].filter(i => i instanceof HTMLElement);
            allInputs.forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.addEventListener('input', () => Renderer.updateAll());
                    el.addEventListener('keydown', (e) => this.handleShortcuts(e));
                }
            });

            // Gestione Logo
            UI.inputs.logo.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => { State.logoBase64 = ev.target.result; Renderer.updateAll(); };
                    reader.readAsDataURL(file);
                }
            };

            // Gestione Grafici Dinamici
            UI.labInputs.btnAddChart.onclick = () => {
                State.charts.push({ id: Date.now(), xLabel: '', yLabel: '', csvData: '' });
                this.renderChartInputs();
                Renderer.updateAll();
            };

            // Pulsanti Download
            UI.btns.download.forEach(btn => {
                if (btn) btn.onclick = () => this.generatePDF();
            });

            // Gestione Modal Info
            UI.btns.info.onclick = () => this.toggleModal(true);
            UI.modal.close.forEach(btn => btn.onclick = () => this.toggleModal(false));
            UI.modal.overlay.onclick = (e) => { if (e.target === UI.modal.overlay) this.toggleModal(false); };
        },

        toggleModal(show) {
            if (show) {
                UI.modal.body.innerHTML = HelpContent[State.mode];
                UI.modal.overlay.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; // Previeni scroll background
            } else {
                UI.modal.overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }
        },

        switchMode(mode) {
            State.mode = mode;
            UI.screens.home.classList.add('hidden');
            UI.screens.app.classList.remove('hidden');

            // UI Setup per Modalità
            if (mode === 'lab') {
                UI.modes.title.textContent = "Lab Report Generator";
                UI.modes.subtitle.textContent = "Crea una relazione tecnica completa e professionale.";
                UI.modes.editorSection.classList.add('hidden');
                UI.modes.labFields.classList.remove('hidden');
            } else {
                UI.modes.title.textContent = "C Code Visualizer";
                UI.modes.subtitle.textContent = "Visualizza e stampa il tuo codice C con stile.";
                UI.modes.editorSection.classList.remove('hidden');
                UI.modes.labFields.classList.add('hidden');
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

                // Event Listeners per i campi dinamici
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
            // CTRL+B per Grassetto
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
            // TAB in textarea Codice
            if (e.key === 'Tab' && e.target === UI.inputs.code) {
                e.preventDefault();
                const s = UI.inputs.code.selectionStart;
                UI.inputs.code.value = UI.inputs.code.value.substring(0, s) + "    " + UI.inputs.code.value.substring(s);
                UI.inputs.code.selectionStart = UI.inputs.code.selectionEnd = s + 4;
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
                // 1. Attendi caricamento font e risorse
                await document.fonts.ready;
                // Attendiamo un attimo extra per rendering layout
                await new Promise(r => setTimeout(r, 500));

                const title = prompt("Titolo file PDF:", UI.inputs.title.value) || "Documento";
                const element = document.querySelector('.pdf-page-mock');

                // 2. Assicura che l'elemento sia visibile e scrollato
                window.scrollTo(0, 0);

                const canvas = await html2canvas(element, {
                    scale: 2,
                    backgroundColor: '#1e293b',
                    useCORS: true, // Fondamentale per GitHub Pages
                    logging: true,  // Abilita log per debug
                    allowTaint: false,
                    scrollX: 0,
                    scrollY: -window.scrollY // Fix posizione se scrollato
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
                // Se siamo su GitHub Pages, potrebbe essere un problema di immagini esterne o font
            } finally {
                btns.forEach(b => { if (b) { b.disabled = false; b.textContent = "Scarica PDF"; } });
            }
        }
    };

    // Avvio Applicazione
    Events.init();
});
