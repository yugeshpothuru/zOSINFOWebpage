/**
 * This is the PUBLIC script file for the website. It handles all dynamic functionality
 * for the public-facing pages, including loading data and filtering.
 * It is designed to be read-only and contains NO editing functionality.
 */

// The 'DOMContentLoaded' event fires when the initial HTML document has been completely loaded and parsed.
document.addEventListener('DOMContentLoaded', async function() {

    // =================================================================================
    // --- CONFIGURATION ---
    // This object holds all the specific settings for each page.
    // =================================================================================
    const pageConfigs = {
        home: {
            htmlFile: 'zosinfo.html',
            dataFile: 'zosinfo-data.json',
            headers: ['Vendor', 'component/product', 'type', 'info']
        },
        linkedin: {
            htmlFile: 'linkedin.html',
            dataFile: 'linkedin-data.json',
            headers: ['Sno', 'topic', 'link']
        }
    };

    // Determine which configuration to use by checking the current page's URL.
    const pageType = window.location.pathname.includes(pageConfigs.linkedin.htmlFile) ? 'linkedin' : 'home';
    const config = pageConfigs[pageType];

    // =================================================================================
    // --- 2. DATA LOADING & STATE ---
    // =================================================================================

    /**
     * Asynchronously fetches and parses the JSON data file for the current page.
     * @param {string} dataFile - The name of the JSON file to load.
     * @returns {Promise<Array>} A promise that resolves to an array of data objects.
     */
    async function loadDataFromFile(dataFile) {
        try {
            const response = await fetch(dataFile);
            if (!response.ok) {
                throw new Error(`Could not find or load ${dataFile}. Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            // If the data file fails to load, log the error and show an alert to the user.
            console.error('Failed to load data from file:', error);
            alert(`Could not load data from '${dataFile}'. Please ensure the file exists and is accessible. The application may not work correctly.`);
            return []; // Return an empty array to prevent further errors.
        }
    }

    // Global state variables for the application.
    let currentData = await loadDataFromFile(config.dataFile);
    let columnHeaders = config.headers;

    // Get references to the main HTML elements the script will manipulate.
    const tableHead = document.querySelector('#data-table thead');
    const tableBody = document.querySelector('#data-table tbody');

    // =================================================================================
    // --- 3. TABLE RENDERING LOGIC ---
    // =================================================================================

    /** Renders the table headers and filter inputs. */
    function renderTableHeaders() {
        tableHead.innerHTML = '';
        const filterRow = document.createElement('tr');
        columnHeaders.forEach(() => {
            // For each column, create a cell with a text input for filtering.
            const cell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'filter-input';
            // The 'keyup' event triggers the filter function every time the user types.
            input.addEventListener('keyup', filterTable); 
            cell.appendChild(input);
            filterRow.appendChild(cell);
        });
        tableHead.appendChild(filterRow);

        const headerRow = document.createElement('tr');
        columnHeaders.forEach(headerText => {
            // Create the actual header cell with the column title.
            const header = document.createElement('th');
            header.textContent = headerText;
            headerRow.appendChild(header);
        });
        tableHead.appendChild(headerRow);
    }

    /**
     * Formats the content of a table cell.
     * This function intelligently decides how to display the cell's value.
     * - If it's a URL, it creates a clickable link.
     * - If it looks like JCL, it formats it with preserved line breaks.
     * - Otherwise, it's treated as plain text.
     * @param {HTMLElement} cell The table cell (<td>) element to populate.
     * @param {string} cellValue The string value for the cell.
     */
    function formatCellContent(cell, cellValue) {
        const value = String(cellValue);

        // Priority 1: Check if the value is a URL.
        if (value.startsWith('http://') || value.startsWith('https://')) {
            const link = document.createElement('a');
            link.href = value;
            link.textContent = value; // The link text is the URL itself.
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            cell.appendChild(link);
            return;
        }

        // Priority 2: Check for JCL-like content to format it nicely.
        // We'll consider any multi-line text containing '//' as JCL-like.
        if (value.includes('//') && value.includes('\n')) {
            const lines = value.split(/[\r\n]+/);
            const content = lines
                .map(line => { // Process each line of the JCL-like text.
                    // Per user request, ignore lines that start with '// '
                    if (line.trim().startsWith('// ')) {
                        return null;
                    }
                    return line;
                })
                .filter(line => line !== null)
                .join('\n'); // Re-join the lines that were not filtered out.

            // Use a <pre> tag to preserve line breaks and spacing.
            const pre = document.createElement('pre'); 
            pre.style.margin = '0';
            pre.style.fontFamily = 'inherit';
            pre.style.fontSize = 'inherit';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordWrap = 'break-word';
            pre.textContent = content;
            cell.appendChild(pre);
            return;
        }

        // Default: If it's not a URL or JCL, display as plain text.
        cell.textContent = value;
    }

    /** Renders the table body with data, applying special formatting where needed. */
    function renderTableBody(data) {
        tableBody.innerHTML = '';
        // Iterate over the provided data (which might be the full dataset or a filtered subset).
        data.forEach((rowData) => {
            // Find the original index of the row from the master `currentData` array.
            // This is important for maintaining consistency, especially in the editor.
            const originalIndex = currentData.indexOf(rowData);
            if (originalIndex === -1) return;

            const row = document.createElement('tr');
            row.dataset.originalIndex = originalIndex;

            columnHeaders.forEach(header => {
                const cell = document.createElement('td');
                const cellValue = rowData[header] || '';
                formatCellContent(cell, cellValue);
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });
    }

    // =================================================================================
    // --- 4. CORE FUNCTIONALITY ---
    // =================================================================================

    /** Filters the table data based on user input. */
    function filterTable() {
        const filterInputs = document.querySelectorAll('.filter-input');
        const filterValues = Array.from(filterInputs).map(input => input.value.toLowerCase());

        // Filter the master `currentData` array.
        const filteredData = currentData.filter(row => {
            // A row is included only if it matches the filter text in *every* column.
            return filterValues.every((filterValue, index) => {
                const header = columnHeaders[index];
                const cellValue = String(row[header]).toLowerCase();
                return cellValue.includes(filterValue); // Check if the cell text contains the filter text.
            });
        });

        renderTableBody(filteredData);
    }

    // =================================================================================
    // --- 5. EVENT LISTENERS & FINAL SETUP ---
    // =================================================================================

    // --- Dropdown Menu Logic ---
    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownContent = document.getElementById('dropdown-content');

    if (dropdownButton) {
        // When the three-dots button is clicked, toggle the 'show' class on the menu content.
        dropdownButton.addEventListener('click', () => {
            dropdownContent.classList.toggle('show');
        });

        // Add a global click listener to close the dropdown if the user clicks anywhere else on the page.
        window.addEventListener('click', (event) => {
            if (!dropdownButton.contains(event.target)) {
                if (dropdownContent.classList.contains('show')) {
                    dropdownContent.classList.remove('show');
                }
            }
        });
    }

    // Initial render of the table on page load.
    renderTableHeaders();
    renderTableBody(currentData);
});

