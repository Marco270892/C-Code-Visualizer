document.addEventListener('DOMContentLoaded', () => {
    const codeInput = document.getElementById('code-input');
    const codeOutput = document.getElementById('code-output');
    const projectTitleInput = document.getElementById('project-title');
    const schoolNameInput = document.getElementById('school-name');
    const studentInfoInput = document.getElementById('student-info');
    const exerciseTextInput = document.getElementById('exercise-text');
    const logoUpload = document.getElementById('logo-upload');
    const logoStatus = document.getElementById('logo-status');
    const downloadBtn = document.getElementById('download-btn');
    const downloadBtnTop = document.getElementById('download-btn-top');

    // Preview elements
    const pdfTitleDisplay = document.getElementById('pdf-title-display');
    const pdfSchoolDisplay = document.getElementById('pdf-school-display');
    const pdfStudentDisplay = document.getElementById('pdf-student-display');
    const pdfExerciseContainer = document.getElementById('pdf-exercise-container');
    const pdfExerciseDisplay = document.getElementById('pdf-exercise-display');
    const pdfLogoContainer = document.getElementById('pdf-logo-container');

    // Load from localStorage
    const savedCode = localStorage.getItem('c-code-persist');
    const savedTitle = localStorage.getItem('c-project-title-persist');
    const savedSchool = localStorage.getItem('c-school-persist');
    const savedStudent = localStorage.getItem('c-student-persist');
    const savedExercise = localStorage.getItem('c-exercise-persist');
    const savedLogo = localStorage.getItem('c-logo-persist');

    if (savedCode) codeInput.value = savedCode;
    if (savedTitle) projectTitleInput.value = savedTitle;
    if (savedSchool) schoolNameInput.value = savedSchool;
    if (savedStudent) studentInfoInput.value = savedStudent;
    if (savedExercise) exerciseTextInput.value = savedExercise;

    let currentLogoBase64 = savedLogo || null;
    if (currentLogoBase64) {
        logoStatus.textContent = 'Caricato ✓';
        logoStatus.style.color = '#38bdf8';
        updateLogoPreview();
    }

    function updateLogoPreview() {
        pdfLogoContainer.innerHTML = '';
        if (currentLogoBase64) {
            const img = document.createElement('img');
            img.src = currentLogoBase64;
            pdfLogoContainer.appendChild(img);
        }
    }

    // Function to update preview
    const updatePreview = () => {
        // Update Code
        const code = codeInput.value;
        codeOutput.textContent = code;
        Prism.highlightElement(codeOutput);

        // Update Header Info
        pdfTitleDisplay.textContent = projectTitleInput.value || "Codice Sorgente C";
        pdfSchoolDisplay.textContent = schoolNameInput.value;
        pdfStudentDisplay.textContent = studentInfoInput.value;

        // Update Exercise
        if (exerciseTextInput.value.trim() !== '') {
            pdfExerciseDisplay.textContent = exerciseTextInput.value;
            pdfExerciseContainer.classList.remove('hidden');
        } else {
            pdfExerciseContainer.classList.add('hidden');
        }

        // Save to localStorage
        localStorage.setItem('c-code-persist', code);
        localStorage.setItem('c-project-title-persist', projectTitleInput.value);
        localStorage.setItem('c-school-persist', schoolNameInput.value);
        localStorage.setItem('c-student-persist', studentInfoInput.value);
        localStorage.setItem('c-exercise-persist', exerciseTextInput.value);
    };

    // Handle Logo Upload
    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentLogoBase64 = event.target.result;
                localStorage.setItem('c-logo-persist', currentLogoBase64);
                logoStatus.textContent = 'Caricato ✓';
                logoStatus.style.color = '#38bdf8';
                updateLogoPreview();
            };
            reader.readAsDataURL(file);
        }
    });

    // Initial preview
    updatePreview();

    // Listen for changes
    codeInput.addEventListener('input', updatePreview);
    projectTitleInput.addEventListener('input', updatePreview);
    schoolNameInput.addEventListener('input', updatePreview);
    studentInfoInput.addEventListener('input', updatePreview);
    exerciseTextInput.addEventListener('input', updatePreview);

    // PDF Generation
    const generatePDF = async () => {
        const { jsPDF } = window.jspdf;

        const btns = [downloadBtn, downloadBtnTop];
        btns.forEach(b => {
            if (b) {
                b.disabled = true;
                b.innerHTML = 'Generazione...';
            }
        });

        try {
            let fileName = prompt("Inserisci il titolo del documento:", projectTitleInput.value);
            if (!fileName) {
                btns.forEach(b => {
                    if (b) {
                        b.disabled = false;
                        b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Scarica PDF`;
                    }
                });
                return;
            }

            const safeFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const element = document.querySelector('.pdf-page-mock');

            if (!element) throw new Error("Elemento PDF non trovato");

            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 150));

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#1e293b',
                logging: false,
                useCORS: true,
                allowTaint: true,
                scrollY: 0,
                y: 0,
                width: 794, // Forza larghezza A4
                height: element.scrollHeight, // Altezza dinamica ma larghezza fissa
                windowWidth: 794
            });

            const imgData = canvas.toDataURL('image/png');

            // Creiamo il PDF con larghezza A4 (595 px a 72 DPI è lo standard jsPDF)
            // Ma manteniamo l'altezza proporzionale a quanto catturato
            const pdfWidth = 595; // Standard A4 pt width
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${safeFileName}.pdf`);

        } catch (error) {
            console.error('Errore:', error);
            alert('Errore durante la creazione del PDF.');
        } finally {
            btns.forEach(b => {
                if (b) {
                    b.disabled = false;
                    b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Scarica PDF`;
                }
            });
        }
    };

    if (downloadBtn) downloadBtn.addEventListener('click', generatePDF);
    if (downloadBtnTop) downloadBtnTop.addEventListener('click', generatePDF);

    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = codeInput.selectionStart;
            const end = codeInput.selectionEnd;
            codeInput.value = codeInput.value.substring(0, start) + "    " + codeInput.value.substring(end);
            codeInput.selectionStart = codeInput.selectionEnd = start + 4;
            updatePreview();
        }
    });
});
