// Wordle Helper Script - With letter constraints
document.addEventListener('DOMContentLoaded', function() {
    // Show the disclaimer popup if it hasn't been shown before
    const disclaimerShown = localStorage.getItem('disclaimerShown');
    const disclaimerPopup = document.getElementById('disclaimer-popup');
    const acceptButton = document.getElementById('accept-disclaimer');
    
    if (!disclaimerShown && disclaimerPopup) {
        disclaimerPopup.classList.remove('hidden');
        
        acceptButton.addEventListener('click', function() {
            disclaimerPopup.classList.add('hidden');
            localStorage.setItem('disclaimerShown', 'true');
        });
    } else if (disclaimerPopup) {
        disclaimerPopup.classList.add('hidden');
    }
    
    // Setup collapsible instructions
    const toggleButton = document.getElementById('toggle-instructions');
    const instructionsContent = document.getElementById('instructions-content');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    // Check if instructions are collapsed in localStorage
    const instructionsCollapsed = localStorage.getItem('instructionsCollapsed') === 'true';
    
    // Initialize state based on localStorage or default to expanded (not collapsed)
    if (instructionsCollapsed) {
        instructionsContent.classList.add('collapsed');
        toggleIcon.classList.add('collapsed');
    }
    
    // Toggle instructions on click
    toggleButton.addEventListener('click', function() {
        // Toggle collapsed state
        instructionsContent.classList.toggle('collapsed');
        toggleIcon.classList.toggle('collapsed');
        
        // Save state to localStorage
        const isCollapsed = instructionsContent.classList.contains('collapsed');
        localStorage.setItem('instructionsCollapsed', isCollapsed);
    });
    
    // Also toggle when clicking the header
    document.querySelector('.instructions-header').addEventListener('click', function(e) {
        // Don't toggle if clicking the button (it has its own handler)
        if (e.target !== toggleButton && !toggleButton.contains(e.target)) {
            toggleButton.click();
        }
    });
    // DOM Elements
    const wordGrid = document.querySelector('.word-grid');
    const keyboard = document.querySelector('.keyboard');
    const addRowBtn = document.getElementById('add-row-btn');
    const resetBtn = document.getElementById('reset-btn');
    const debugOutput = document.getElementById('debug-output');
    
    if (!wordGrid || !keyboard || !addRowBtn || !resetBtn) {
        console.error('One or more required elements not found');
        return;
    }
    
    // Global state variables
    let currentRowIndex = -1;
    let letterStates = {}; // tracks the state of each letter (correct, present, absent)
    let letterPositions = {}; // tracks which positions have known letters
    let excludedPositions = {}; // tracks positions where specific letters can't be
    
    // Debug function - sends messages to the debug output element if it exists
    function debug(message) {
        if (debugOutput) {
            const messageElement = document.createElement('div');
            messageElement.textContent = message;
            debugOutput.prepend(messageElement);
            
            // Limit debug messages to 20
            while (debugOutput.children.length > 20) {
                debugOutput.removeChild(debugOutput.lastChild);
            }
        }
        console.log(message);
    }
    
    // Configuration
    const WORD_LENGTH = 5;
    const MAX_ROWS = 6;
    
    // Add debugging info
    debug("Script loaded!");
    
    // Set up event listeners for keyboard
    document.addEventListener('keydown', handleKeyPress);
    
    // Initialize the game
    createKeyboard();
    addRow();
    updateMustUseLetters();
    
    // Main keyboard handler function
    function handleKeyPress(event) {
        debug("Key pressed: " + event.key);
        
        // Process letter keys
        if (/^[a-z]$/i.test(event.key)) {
            handleKeyInput(event.key);
        }
        // Process backspace key
        else if (event.key === 'Backspace') {
            removeLetter();
        }
        // Handle Enter to add a new row
        else if (event.key === 'Enter') {
            addRow();
        }
    }
    
    // Handle keyboard input (typing, backspace, etc)
    function handleKeyInput(key) {
        if (key === 'backspace' || key === 'Backspace') {
            removeLetter();
            return;
        }

        if (key === 'enter' || key === 'Enter') {
            addRow();
            return;
        }

        // Only handle letters a-z
        if (!/^[a-z]$/i.test(key)) {
            return;
        }
        
        const letterKey = key.toLowerCase();
        
        // Find the current active row
        const rows = document.querySelectorAll('.word-row');
        if (currentRowIndex < 0 || currentRowIndex >= rows.length) {
            return;
        }
        
        const activeRow = rows[currentRowIndex];
        if (!activeRow) return;
        
        // Find the first empty box in the active row
        const emptyBoxes = Array.from(activeRow.querySelectorAll('.letter-box:not(.filled)'));
        if (emptyBoxes.length === 0) return; // Row is full
        
        const targetBox = emptyBoxes[0];
        
        // If there's a ghost letter, save it for later restoration if needed
        if (targetBox.classList.contains('ghost-correct')) {
            targetBox.dataset.originalLetter = targetBox.textContent.toLowerCase();
            targetBox.classList.remove('ghost-correct');
        }
        
        // Insert the letter
        targetBox.textContent = letterKey.toUpperCase();
        targetBox.classList.add('filled');
        
        // Auto-highlight if this is a known letter in the correct position
        const position = parseInt(targetBox.dataset.position);
        if (letterPositions[position] === letterKey) {
            // This is a known correct letter in the right position
            targetBox.classList.add('correct-ghost'); // Use ghostly version
            letterStates[letterKey] = 'correct';
            debug(`Auto-highlighted correct letter '${letterKey}' at position ${position} with ghost effect`);
        } 
        // Auto-highlight if this is a known present letter
        else if (letterStates[letterKey] === 'present') {
            targetBox.classList.add('present');
            debug(`Auto-highlighted present letter '${letterKey}'`);
        }
        // Auto-highlight if this is a known absent letter
        else if (letterStates[letterKey] === 'absent') {
            targetBox.classList.add('absent-ghost'); // Use ghostly version
            debug(`Auto-highlighted absent letter '${letterKey}' with ghost effect`);
        }
        
        // Update UI
        updateKeyboardColors();
        updateMustUseLetters();
        
        debug(`Added letter '${letterKey}' to row ${currentRowIndex+1}`);
    }
    
    // Insert a letter from keyboard/click
    function insertLetter(letter) {
        debug(`Inserting letter: ${letter}`);
        addLetter(letter.toLowerCase());
    }
    
    // Add a letter to the current row
    function addLetter(letter) {
        debug("Adding letter: " + letter);
        
        const rows = document.querySelectorAll('.word-row');
        debug("Rows found: " + rows.length + ", current index: " + currentRowIndex);
        
        if (!rows[currentRowIndex]) {
            debug("No active row found");
            return;
        }
        
        const currentRow = rows[currentRowIndex];
        
        // Find the first empty box (including ghost letters)
        const allBoxes = Array.from(currentRow.querySelectorAll('.letter-box'));
        let emptyBoxIndex = -1;
        
        for (let i = 0; i < allBoxes.length; i++) {
            if (!allBoxes[i].classList.contains('filled')) {
                emptyBoxIndex = i;
                break;
            }
        }
        
        if (emptyBoxIndex !== -1) {
            const targetBox = allBoxes[emptyBoxIndex];
            const position = parseInt(targetBox.dataset.position);
            
            // Store the original correct letter for this position if it's a ghost letter
            if (targetBox.classList.contains('ghost-correct')) {
                const originalLetter = letterPositions[position];
                debug(`Position ${position + 1} has ghost letter '${originalLetter}', temporarily replacing with '${letter}'`);
                // Save the ghost letter in the dataset for reference
                targetBox.dataset.originalLetter = originalLetter;
                // Remove ghost appearance but keep original letter in memory
                targetBox.classList.remove('ghost-correct');
            }
            
            // Set the typed letter in the box
            targetBox.textContent = letter.toUpperCase();
            targetBox.classList.add('filled');
            debug("Letter added successfully");
            
            // Highlight the corresponding key on the virtual keyboard
            highlightKey(letter);
            
            // Update the must-use letters
            updateMustUseLetters();
        }
    }
    
    // Remove the last letter from the current row
    function removeLetter() {
        debug("Removing letter");
        
        const rows = document.querySelectorAll('.word-row');
        if (!rows[currentRowIndex]) {
            debug("No active row found");
            return;
        }
        
        const currentRow = rows[currentRowIndex];
        const filledBoxes = currentRow.querySelectorAll('.letter-box.filled');
        
        if (filledBoxes.length > 0) {
            const lastFilledBox = filledBoxes[filledBoxes.length - 1];
            const position = parseInt(lastFilledBox.dataset.position);
            
            // Check if this position originally had a ghost letter
            if (lastFilledBox.dataset.originalLetter) {
                const originalLetter = lastFilledBox.dataset.originalLetter;
                debug(`Restoring ghost letter '${originalLetter}' at position ${position+1}`);
                
                // Restore the ghost letter appearance
                lastFilledBox.textContent = originalLetter.toUpperCase();
                lastFilledBox.classList.remove('filled', 'correct', 'present', 'absent', 'correct-ghost', 'absent-ghost');
                lastFilledBox.classList.add('ghost-correct');
                delete lastFilledBox.dataset.originalLetter;
            } else {
                // Standard removal
                lastFilledBox.textContent = '';
                lastFilledBox.classList.remove('filled', 'correct', 'present', 'absent', 'correct-ghost', 'absent-ghost');
            }
            
            debug("Letter removed successfully");
            
            updateKeyboardColors();
            updateMustUseLetters();
            return true;
        }
        
        return false;
    }
    
    // Highlight a key on the virtual keyboard
    function highlightKey(letter) {
        const key = document.querySelector(`.keyboard-key[data-key="${letter}"]`);
        if (key) {
            // Add flash effect
            key.style.backgroundColor = "#4285f4";
            key.style.color = "white";
            
            // Reset after a short delay
            setTimeout(() => {
                key.style.backgroundColor = "";
                key.style.color = "";
                
                // Make sure the key has the correct state color after animation
                updateKeyboardColors();
            }, 150);
        }
    }
    
    // Update keyboard colors based on letter states
    // Function to update ghost letters across all rows based on letterPositions
    function updateGhostLetters() {
        debug("Updating ghost letters across all rows");
        
        // First, clear all existing ghost letter statuses to prevent stale data
        document.querySelectorAll('.word-row .letter-box.ghost-correct').forEach(box => {
            if (!box.classList.contains('filled')) {
                box.textContent = '';
                box.classList.remove('ghost-correct');
                delete box.dataset.originalLetter;
            }
        });
        
        // Debug the current letterPositions to help diagnose issues
        let knownPositions = [];
        for (let pos in letterPositions) {
            knownPositions.push(`${pos}: ${letterPositions[pos]}`);
        }
        debug(`Known letter positions: ${knownPositions.join(', ') || 'None'}`); 
        
        // Get all rows and iterate through them
        const rows = document.querySelectorAll('.word-row');
        
        rows.forEach((row, rowIndex) => {
            // For each row, check all letter boxes
            const boxes = row.querySelectorAll('.letter-box');
            
            boxes.forEach(box => {
                const position = parseInt(box.dataset.position);
                
                // Skip any boxes that have user-entered letters (filled)
                if (box.classList.contains('filled')) {
                    return;
                }
                
                // Apply ghost letters from letterPositions
                if (letterPositions[position]) {
                    const knownLetter = letterPositions[position];
                    box.textContent = knownLetter.toUpperCase();
                    box.classList.add('ghost-correct');
                    box.dataset.originalLetter = knownLetter;
                    debug(`Row ${rowIndex+1}, Position ${position+1}: Added ghost letter '${knownLetter.toUpperCase()}'`);
                }
            });
        });
    }
    
    // Sync letter states with position data
    function syncLetterStates() {
        debug("Syncing letter states with position data");
        
        // Check for any discrepancies between letterStates and letterPositions
        for (const letter in letterStates) {
            if (letterStates[letter] === 'correct') {
                // Find which position this letter is correct in
                let foundInPosition = false;
                for (const position in letterPositions) {
                    if (letterPositions[position] === letter) {
                        foundInPosition = true;
                        break;
                    }
                }
                
                if (!foundInPosition) {
                    // Find where this letter is marked as correct in the grid
                    const correctBoxes = document.querySelectorAll('.letter-box.correct');
                    correctBoxes.forEach(box => {
                        if (box.textContent.toLowerCase() === letter) {
                            const position = parseInt(box.dataset.position);
                            letterPositions[position] = letter;
                            debug(`Fixed tracking: Added letter ${letter} as correct at position ${position}`);
                        }
                    });
                }
            }
        }
        
        // Also check the reverse - if a position has a letter that isn't marked as correct
        for (const position in letterPositions) {
            const letter = letterPositions[position];
            if (letter && (!letterStates[letter] || letterStates[letter] !== 'correct')) {
                letterStates[letter] = 'correct';
                debug(`Fixed tracking: Updated letter ${letter} state to 'correct'`);
            }
        }
        
        // Debug the current state after syncing
        debug("Current letter positions after sync: " + JSON.stringify(letterPositions));
        debug("Letter states after sync: " + JSON.stringify(letterStates));
    }
    
    // Update keyboard colors based on letter states
    function updateKeyboardColors() {
        debug("Updating keyboard colors");
        
        // First ensure letter states are in sync
        syncLetterStates();
        
        const keys = document.querySelectorAll('.keyboard-key');
        
        // First pass: Reset all keys to ensure we clear any outdated states
        keys.forEach(key => {
            const letter = key.getAttribute('data-key');
            if (!letter || letter === '⌫') return;
            
            // Reset all classes first
            key.classList.remove('correct', 'present', 'absent');
        });
        
        // Second pass: Re-establish colors based on current letter states
        // This ensures if there are multiple letters with different states, we respect the priority
        // Priority: correct > present > absent
        const letterCounts = {};
        
        // Count all filled letter instances on the board
        document.querySelectorAll('.letter-box.filled').forEach(box => {
            const letter = box.textContent.toLowerCase();
            if (!letterCounts[letter]) letterCounts[letter] = 0;
            letterCounts[letter]++;
            
            // Track the highest priority state for each letter
            if (box.classList.contains('correct')) {
                letterStates[letter] = 'correct';
            } else if (box.classList.contains('present') && letterStates[letter] !== 'correct') {
                letterStates[letter] = 'present';
            } else if (box.classList.contains('absent') && !letterStates[letter]) {
                letterStates[letter] = 'absent';
            }
        });
        
        // Apply colors to the keyboard based on letter states
        keys.forEach(key => {
            const letter = key.getAttribute('data-key');
            if (!letter || letter === '⌫') return;
            
            // Only color the key if the letter exists on the board
            if (letterCounts[letter] && letterStates[letter]) {
                key.classList.add(letterStates[letter]);
                debug(`Set key ${letter} to ${letterStates[letter]}`);
            }
        });
    }
    
    // Update the display of must-use letters (letters that are present but position unknown)
    function updateMustUseLetters() {
        const mustUseLettersElement = document.getElementById('must-use-letters');
        if (!mustUseLettersElement) return;
        
        // Clear existing content
        mustUseLettersElement.innerHTML = '';
        
        // Find all letters that are 'present' (yellow) but don't have a known position
        const lettersToShow = [];
        
        // Check all letters with 'present' state
        for (const letter in letterStates) {
            if (letterStates[letter] === 'present') {
                // Check if this letter has been placed in a correct position already
                let hasCorrectPosition = false;
                for (const position in letterPositions) {
                    if (letterPositions[position] === letter) {
                        hasCorrectPosition = true;
                        break;
                    }
                }
                
                if (!hasCorrectPosition) {
                    lettersToShow.push(letter);
                }
            }
        }
        
        // Create and append letter elements
        lettersToShow.forEach(letter => {
            const letterElement = document.createElement('div');
            letterElement.classList.add('must-use-letter');
            letterElement.textContent = letter.toUpperCase();
            mustUseLettersElement.appendChild(letterElement);
        });
        
        debug(`Updated must-use letters: ${lettersToShow.join(', ').toUpperCase() || 'none'}`);
    }
    
    // Checks if there are other instances of a letter with the same state
    function checkForOtherInstancesOfLetter(letter, position) {
        // Get all letter boxes with the same letter
        const letterBoxes = document.querySelectorAll('.letter-box.filled');
        let otherCorrect = false;
        let otherPresent = false;
        let otherAbsent = false;
        
        letterBoxes.forEach(box => {
            // Skip checking the current box we're removing
            if (parseInt(box.dataset.position) === position && 
                box.closest('.word-row').dataset.rowIndex === currentRowIndex.toString()) {
                return;
            }
            
            // If this box has the same letter, check its state
            if (box.textContent.toLowerCase() === letter) {
                if (box.classList.contains('correct')) {
                    otherCorrect = true;
                } else if (box.classList.contains('present')) {
                    otherPresent = true;
                } else if (box.classList.contains('absent')) {
                    otherAbsent = true;
                }
            }
        });
        
        debug(`Letter ${letter} status: otherCorrect=${otherCorrect}, otherPresent=${otherPresent}, otherAbsent=${otherAbsent}`);
        
        // Return true if we found another instance with the same state
        if (letterStates[letter] === 'correct' && otherCorrect) return true;
        if (letterStates[letter] === 'present' && otherPresent) return true;
        if (letterStates[letter] === 'absent' && otherAbsent) return true;
        
        return false;
    }
    
    // Add a new row to the grid
    function addRow() {
        debug("Adding new row");
        
        const row = document.createElement('div');
        row.classList.add('word-row');
        
        // Log all known letter positions for debugging
        let positionInfo = [];
        for (const pos in letterPositions) {
            positionInfo.push(`position ${pos}: ${letterPositions[pos].toUpperCase()}`);
        }
        debug(`Adding row with known positions: ${positionInfo.join(', ') || 'none'}`);
        
        for (let i = 0; i < WORD_LENGTH; i++) {
            const box = document.createElement('div');
            box.classList.add('letter-box');
            box.dataset.position = i;
            
            // Always show ghost letters for known positions
            if (letterPositions[i] !== undefined) {
                const knownLetter = letterPositions[i];
                box.textContent = knownLetter.toUpperCase();
                box.classList.add('ghost-correct');
                box.dataset.originalLetter = knownLetter;
                debug(`Added ghost letter at position ${i+1}: ${knownLetter.toUpperCase()}`);
            }
            
            // Make letter boxes droppable
            box.draggable = false;
            box.addEventListener('dragover', function(e) {
                e.preventDefault();
                if (!this.classList.contains('filled')) {
                    this.classList.add('drag-hover');
                }
            });
            
            box.addEventListener('dragleave', function() {
                this.classList.remove('drag-hover');
            });
            
            box.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-hover');
                
                // Get the letter being dragged
                const letter = e.dataTransfer.getData('text');
                if (!letter) return;
                
                // If this box already has a letter and it's not a ghost, don't overwrite it
                if (this.classList.contains('filled') && !this.classList.contains('ghost-correct')) return;
                
                // Handle the case where we're dropping onto a ghost letter
                if (this.classList.contains('ghost-correct')) {
                    // Store the original ghost letter for potential restoration
                    if (!this.dataset.originalLetter) {
                        this.dataset.originalLetter = this.textContent.toLowerCase();
                    }
                    this.classList.remove('ghost-correct');
                }
                
                // Set the letter in this box
                this.textContent = letter.toUpperCase();
                this.classList.add('filled');
                
                // Auto-highlight if this is a known letter in the correct position
                const position = parseInt(this.dataset.position);
                if (letterPositions[position] === letter) {
                    // This is a known correct letter in the right position
                    this.classList.add('correct-ghost'); // Use ghostly version
                    letterStates[letter] = 'correct';
                    debug(`Auto-highlighted correct letter '${letter}' at position ${position} with ghost effect`);
                } 
                // Auto-highlight if this is a known present letter
                else if (letterStates[letter] === 'present') {
                    this.classList.add('present');
                    debug(`Auto-highlighted present letter '${letter}'`);
                }
                // Auto-highlight if this is a known absent letter
                else if (letterStates[letter] === 'absent') {
                    this.classList.add('absent-ghost'); // Use ghostly version
                    debug(`Auto-highlighted absent letter '${letter}' with ghost effect`);
                }
                
                // Focus this box to allow for immediate cycling of states if desired
                this.focus();
                
                // Update other UI elements
                updateKeyboardColors();
                updateMustUseLetters();
            });
            
            // Right click to clear the box
            box.addEventListener('contextmenu', function(e) {
                e.preventDefault(); // Prevent context menu from appearing
                
                const letter = this.textContent.toLowerCase();
                const position = parseInt(this.dataset.position);
                
                if (this.classList.contains('filled')) {
                    debug(`Removing letter '${letter}' at position ${position}`);
                    
                    // Check if this is a correct letter
                    if (this.classList.contains('correct')) {
                        // Remove from correct positions tracking
                        if (letterPositions[position] === letter) {
                            delete letterPositions[position];
                            debug(`Removed letter '${letter}' from correct positions at ${position}`);
                        }
                    }
                    
                    // Check if this letter should be removed from excluded positions
                    if (this.classList.contains('present')) {
                        if (excludedPositions[letter]) {
                            excludedPositions[letter] = excludedPositions[letter].filter(pos => pos !== position);
                            if (excludedPositions[letter].length === 0) {
                                delete excludedPositions[letter];
                            }
                            debug(`Removed position ${position} from excluded positions for letter '${letter}'`);
                        }
                    }
                    
                    // Check if we need to update the global letter state
                    // Only update if there are no other instances of the letter with the same state
                    const shouldUpdateLetterState = !checkForOtherInstancesOfLetter(letter, position);
                    if (shouldUpdateLetterState && letterStates[letter]) {
                        delete letterStates[letter];
                        debug(`Removed global state tracking for letter '${letter}'`);
                    }
                }
                
                // Remove letter state classes
                this.classList.remove('filled', 'correct', 'present', 'absent', 'correct-ghost', 'absent-ghost');
                
                // Clear the letter
                this.textContent = '';
                
                // If this box has an original ghost letter, restore it
                if (this.dataset.originalLetter) {
                    this.textContent = this.dataset.originalLetter.toUpperCase();
                    this.classList.add('ghost-correct');
                    debug(`Restored ghost letter: ${this.dataset.originalLetter.toUpperCase()}`);
                }
                
                // Update UI
                syncLetterStates();
                updateKeyboardColors();
                updateMustUseLetters();
                updateGhostLetters();
                return false;
            });
            
            // Click handler to cycle through states
            box.addEventListener('click', function() {
                if (!this.classList.contains('filled')) return;
                
                const letter = this.textContent.toLowerCase();
                const position = parseInt(this.dataset.position);
                debug(`Cycling state for letter '${letter}' at position ${position}`);
                
                // Get current state
                const hasCorrect = this.classList.contains('correct');
                const hasPresent = this.classList.contains('present');
                const hasAbsent = this.classList.contains('absent');
                
                // Clear all state classes
                this.classList.remove('correct', 'present', 'absent', 'correct-ghost', 'absent-ghost');
                
                // New cycle order: normal → absent (gray) → correct (green) → present (yellow) → normal
                if (!hasCorrect && !hasPresent && !hasAbsent) {
                    // normal → absent (gray)
                    this.classList.add('absent');
                    letterStates[letter] = 'absent';
                    debug(`Marked '${letter}' as absent`);
                } 
                else if (hasAbsent) {
                    // absent → correct (green)
                    this.classList.add('correct');
                    letterStates[letter] = 'correct';
                    letterPositions[position] = letter;
                    debug(`Marked '${letter}' as correct at position ${position}`);
                } 
                else if (hasCorrect) {
                    // correct → present (yellow)
                    this.classList.add('present');
                    letterStates[letter] = 'present';
                    
                    // Remove from correct positions
                    if (letterPositions[position] === letter) {
                        delete letterPositions[position];
                    }
                    
                    // Add to excluded positions
                    if (!excludedPositions[letter]) {
                        excludedPositions[letter] = [];
                    }
                    if (!excludedPositions[letter].includes(position)) {
                        excludedPositions[letter].push(position);
                    }
                    
                    debug(`Marked '${letter}' as present, can't be at position ${position}`);
                }
                // present → normal (no classes)
                else if (hasPresent) {
                    // If this is the only instance of the letter, update global state
                    if (letterStates[letter]) {
                        delete letterStates[letter];
                    }
                    
                    // Remove from excluded positions
                    if (excludedPositions[letter]) {
                        excludedPositions[letter] = excludedPositions[letter].filter(pos => pos !== position);
                        if (excludedPositions[letter].length === 0) {
                            delete excludedPositions[letter];
                        }
                    }
                    
                    debug(`Returned '${letter}' to normal state`);
                }
                
                // Update UI
                syncLetterStates();
                updateKeyboardColors();
                updateMustUseLetters();
                updateGhostLetters();
            });
            
            row.appendChild(box);
        }
        
        wordGrid.appendChild(row);
        currentRowIndex = document.querySelectorAll('.word-row').length - 1;
        debug("Row added, current index is now: " + currentRowIndex);
        
        // Update the keyboard colors and must-use letters after adding a new row
        updateKeyboardColors();
        updateMustUseLetters();
        
        // Ensure ghost letters are updated for the new row
        syncLetterStates();
        updateGhostLetters();
    }
    
    // Make letter boxes draggable
    function makeLetterBoxesDraggable() {
        const rows = document.querySelectorAll('.word-row');
        rows.forEach(row => {
            const boxes = row.querySelectorAll('.letter-box.filled');
            
            boxes.forEach(box => {
                if (!box.classList.contains('filled')) return;
                
                box.draggable = true;
                
                box.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text', this.textContent.toLowerCase());
                    this.classList.add('dragging');
                });
                
                box.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                });
            });
        });
    }
    
    // Create the virtual keyboard
    function createKeyboard() {
        debug("Creating keyboard");
        
        const keyboardLayout = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫']
        ];
        
        keyboardLayout.forEach(row => {
            const keyboardRow = document.createElement('div');
            keyboardRow.classList.add('keyboard-row');
            
            row.forEach(key => {
                const keyElement = document.createElement('div');
                keyElement.classList.add('keyboard-key');
                keyElement.dataset.key = key;
                
                if (key === 'enter') {
                    keyElement.textContent = 'ENTER';
                    keyElement.classList.add('wide-key');
                } else {
                    keyElement.textContent = key === '⌫' ? key : key.toUpperCase();
                }
                
                // Add click handler for the key
                keyElement.addEventListener('click', function() {
                    if (key === 'enter') {
                        addRow();
                    } else if (key === '⌫') {
                        handleKeyInput('backspace');
                    } else {
                        handleKeyInput(key);
                    }
                });
                
                
                // Make keyboard keys draggable (excluding special keys)
                if (key !== 'enter' && key !== '⌫') {
                    keyElement.draggable = true;
                    
                    keyElement.addEventListener('dragstart', function(e) {
                        e.dataTransfer.setData('text', key);
                        this.classList.add('dragging');
                    });
                    
                    keyElement.addEventListener('dragend', function() {
                        this.classList.remove('dragging');
                    });
                }
                
                keyboardRow.appendChild(keyElement);
            });
            
            keyboard.appendChild(keyboardRow);
        });
        
        debug("Keyboard created with " + keyboardLayout.flat().length + " keys");
    }
    
    // Click handlers for buttons
    addRowBtn.addEventListener('click', function() {
        addRow();
    });
    
    resetBtn.addEventListener('click', function() {
        resetGame();
    });
    
    // Reset all data and UI
    function resetGame() {
        debug("Resetting game...");
        
        // Clear all global state
        currentRowIndex = -1;
        letterStates = {};
        letterPositions = {};
        excludedPositions = {};
        
        // Clear the word grid
        const wordGridElement = document.querySelector('.word-grid');
        if (wordGridElement) {
            wordGridElement.innerHTML = '';
        }
        
        // Reset keyboard highlights
        const keys = document.querySelectorAll('.keyboard-key');
        keys.forEach(key => {
            key.className = 'keyboard-key';
        });
        
        // Clear the must-use letters
        const mustUseLettersElement = document.getElementById('must-use-letters');
        if (mustUseLettersElement) {
            mustUseLettersElement.innerHTML = '';
        }
        
        // Clear the debug output
        const debugOutputElement = document.getElementById('debug-output');
        if (debugOutputElement) {
            debugOutputElement.innerHTML = '';
        }
        
        // Add the first row
        addRow();
        
        // Ensure letter states are properly synchronized
        syncLetterStates();
        
        // Ensure ghost letters are updated
        updateGhostLetters();
        
        debug("Game reset complete.");
    }
});
