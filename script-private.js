/**
 * Gemini Code Assist: PRIVATE SCRIPT (EDITOR)
 * -------------------------------------------
 * This script powers the private `edit.html` page.
 * It includes all the functionality of the public script, plus:
 *   - Password protection to enable editing.
 *   - Functions to add, edit, and delete rows in the table.
 *   - A "save" function that generates a new, updated JSON file for download.
 */

// The 'DOMContentLoaded' event fires when the initial HTML document has been completely loaded and parsed.
document.addEventListener('DOMContentLoaded', function() {

    // =================================================================================
    // --- 1. CONFIGURATION & INITIALIZATION ---
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

    // =================================================================================
    // --- 2. DATA LOADING ---
    // =================================================================================
    async function loadDataFromFile(dataFile) {
        try {
            const response = await fetch(dataFile);
            if (!response.ok) {
                throw new Error(`Could not find or load ${dataFile}. Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to load data from file:', error);
            alert(`Could not load data from '${dataFile}'. Please ensure the file exists and is accessible. The application may not work correctly.`);
            return [];
        }
    }

    // =================================================================================
    // --- 3. GLOBAL STATE AND CONSTANTS ---
    // =================================================================================
    const EDIT_PASSWORD = 'password123'; // Your private password.

    // These variables manage the state of the editor and will be updated as the user interacts with the page.
    let pageType;
    let config;
    let currentData;
    let columnHeaders;
    let isEditMode = false; // Tracks if the editor is in "edit" or "view" mode.
    let selectedRowIndex = -1; // Tracks which row is currently selected for deletion.

    // Get references to the main HTML elements.
    const pageSelector = document.getElementById('page-selector'); // The hidden <select> element.
    const tableHead = document.querySelector('#data-table thead'); // The table header.
    const tableBody = document.querySelector('#data-table tbody'); // The table body.

    // =================================================================================
    // --- 4. TABLE RENDERING LOGIC ---
    // =================================================================================

    /** Creates and renders the table header rows. */
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

    /** Renders the table body with data, applying special formatting in view mode. */
    function renderTableBody(data) {
        tableBody.innerHTML = '';
        // Iterate over the provided data (which might be the full dataset or a filtered subset).
        data.forEach((rowData) => {
            // Find the original index of the row from the master `currentData` array.
            // This is crucial for saving changes back to the correct object in the array.
            const originalIndex = currentData.indexOf(rowData);
            if (originalIndex === -1) return;

            const row = document.createElement('tr');
            row.dataset.originalIndex = originalIndex;

            // Add a click listener to each row to handle selection in edit mode.
            row.addEventListener('click', () => {
                if (isEditMode) {
                    const previouslySelected = document.querySelector('tr.selected');
                    if (previouslySelected) {
                        previouslySelected.classList.remove('selected');
                    }
                    row.classList.add('selected');
                    selectedRowIndex = originalIndex;
                }
            });

            columnHeaders.forEach(header => {
                const cell = document.createElement('td');
                const cellValue = rowData[header] || '';

                // If in edit mode, make the cells directly editable.
                if (isEditMode) {
                    cell.contentEditable = 'true';
                    cell.textContent = cellValue;
                } else {
                    // Otherwise, use the standard formatting for read-only view.
                    // Use the new formatting function for display mode
                    formatCellContent(cell, cellValue);
                }
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });
    }

    // =================================================================================
    // --- 5. CORE EDITOR FUNCTIONALITY ---
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

    /** Handles F6 key press for entering edit mode or adding rows. */
    function handleF6() {
        // If not currently in edit mode, prompt for the password.
        if (!isEditMode) {
            const password = prompt('Please enter the password to edit:');
            if (password === EDIT_PASSWORD) {
                // If password is correct, enable editing on all cells and set the mode.
                const cells = tableBody.querySelectorAll('td');
                cells.forEach(cell => { cell.contentEditable = 'true'; });
                tableBody.style.border = '2px solid #007bff';
                isEditMode = true;
                alert('Edit mode enabled. Click a row to select it.\n\n- Press F6 to add a new row.\n- Press F7 to delete the selected row.\n- Press Esc to save and exit.');
            } else if (password !== null) {
                // If password was entered but is incorrect.
                alert('Incorrect password.');
            }
        } else {
            // If already in edit mode, F6 adds new rows.
            const numRowsStr = prompt("How many rows would you like to add?", "1");
            if (numRowsStr === null) return;
            const numRows = parseInt(numRowsStr, 10);
            if (isNaN(numRows) || numRows < 1) {
                alert("Please enter a valid number greater than 0.");
                return;
            }
            // Create new empty row objects and add them to the master data array.
            for (let i = 0; i < numRows; i++) {
                const newRow = {};
                columnHeaders.forEach(header => newRow[header] = '');
                currentData.push(newRow);
            }
            renderTableBody(currentData);
        }
    }

    /** Handles Escape key press to save changes and exit edit mode. */
    function handleEscape() {
        if (!isEditMode) return;

        // Disable editing on all cells and remove the visual border.
        const cells = tableBody.querySelectorAll('td');
        cells.forEach(cell => cell.contentEditable = 'false');
        tableBody.style.border = 'none';

        // Create a map to hold the updated data by reading directly from the HTML table (the DOM).
        // This is simpler than tracking every single change event.
        const domChanges = new Map();
        tableBody.querySelectorAll('tr').forEach(row => {
            if (row.dataset.originalIndex) {
                const originalIndex = parseInt(row.dataset.originalIndex, 10);
                const newRowData = {};
                const rowCells = row.querySelectorAll('td');
                // For each cell in the row, get its text content and assign it to the correct property.
                rowCells.forEach((cell, cellIndex) => {
                    const header = columnHeaders[cellIndex];
                    newRowData[header] = cell.textContent.trim();
                });
                domChanges.set(originalIndex, newRowData); // Store the updated row data in the map.
            }
        });

        // Create the final, updated data array.
        const updatedData = currentData
            .map((originalRow, index) => {
                // If a row's index exists in our `domChanges` map, use the updated version. Otherwise, keep the original.
                return domChanges.has(index) ? domChanges.get(index) : originalRow;
            })
            .filter(row => {
                // Filter out any rows that are completely empty.
                return !columnHeaders.every(header => (row[header] || '').trim() === '');
            });

        currentData.splice(0, currentData.length, ...updatedData);

        function downloadDataAsFile(data) {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' }); // Create a Blob object from the JSON string.
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = config.dataFile; // Set the default filename for the download.
            document.body.appendChild(a);
            a.click(); // Programmatically click the link to trigger the download.
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`Your data has been prepared for download. Please save the new '${a.download}' file, replacing the old one in your project folder.`);
        }

        // Trigger the download process.
        downloadDataAsFile(currentData);

        // Reset the state back to view mode and re-render the table.
        isEditMode = false;
        filterTable();
    }

    /** Handles F7 key press to delete the selected row. */
    function handleF7() {
        if (!isEditMode) return;
        // Check if a row has been selected by clicking on it.
        if (selectedRowIndex > -1) {
            currentData.splice(selectedRowIndex, 1);
            // Reset selection and re-render the table to show the deletion.
            selectedRowIndex = -1;
            filterTable();
        } else {
            alert('No row selected. Click a row to select it for deletion.');
        }
    }

    // =================================================================================
    // --- 6. INITIALIZATION AND EVENT LISTENERS ---
    // =================================================================================

    /** Main function to load data and render the table based on dropdown selection. */
    async function initializePage() {
        const selectedPage = pageSelector.value;
        pageType = selectedPage.includes('linkedin.html') ? 'linkedin' : 'home';
        config = pageConfigs[pageType];

        // Load the data and set the global state for the selected page.
        currentData = await loadDataFromFile(config.dataFile);
        columnHeaders = config.headers;

        isEditMode = false;
        selectedRowIndex = -1;

        // Render the table with the new data.
        renderTableHeaders();
        renderTableBody(currentData);
    }

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

        // Handle clicks on the dropdown menu items to change the data source.
        dropdownContent.addEventListener('click', (event) => {
            if (event.target.tagName === 'A' && event.target.dataset.value) {
                event.preventDefault(); // Prevent navigation
                pageSelector.value = event.target.dataset.value;
                // Manually trigger the 'change' event on the hidden select to run initializePage
                pageSelector.dispatchEvent(new Event('change'));
                dropdownContent.classList.remove('show'); // Hide dropdown after selection
            }
        });
    }

    // Listen for changes on the hidden <select> element to trigger a page reload.
    pageSelector.addEventListener('change', initializePage);

    // Add custom Tab key navigation for a spreadsheet-like editing experience.
    tableBody.addEventListener('keydown', function(event) {
        if (event.key !== 'Tab' || !isEditMode) return;
        event.preventDefault(); // Prevent the default tab behavior (moving to the next browser element).
        const activeCell = document.activeElement;
        if (!activeCell || activeCell.tagName !== 'TD') return;

        // Get all editable cells and figure out the next one to focus on.
        const allCells = Array.from(tableBody.querySelectorAll('td'));
        const currentIndex = allCells.indexOf(activeCell);
        const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;

        // If the next cell exists, focus it.
        if (nextIndex >= 0 && nextIndex < allCells.length) {
            allCells[nextIndex].focus();
        }
    });

    // Add a global keyboard event listener for function keys.
    document.addEventListener('keydown', function(event) {
        switch (event.key) {
            case 'F6':
                event.preventDefault();
                handleF6();
                break;
            case 'Escape':
                event.preventDefault();
                handleEscape();
                break;
            case 'F7':
                event.preventDefault();
                handleF7();
                break;
        }
    });

    // Perform the initial page load.
    initializePage();
});

