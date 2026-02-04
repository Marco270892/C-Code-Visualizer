// PATCH FILE: Sostituisci solo la funzione renderFlowchart in app.js con questa:

function renderFlowchart(mode) {
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
}

// RIMUOVI anche l'inizializzazione di Mermaid in Events.init() (righe 663-671)
