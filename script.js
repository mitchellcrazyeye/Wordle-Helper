// Wordle Helper Script - Simplified Version
document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const WORD_LENGTH = 5;
    const MAX_ROWS = 6;
    
    // State
    let currentRowIndex = 0;
    let letterStates = {}; // Tracks the state of each letter (correct, present, absent)
    let letterPositions = {}; // Tracks known positions for letters
    let excludedPositions = {}; // Tracks positions where we know a letter can't be

    // DOM Elements
    const wordGrid = document.querySelector('.word-grid');
    const keyboard = document.querySelector('.keyboard');
    const addRowBtn = document.getElementById('add-row-btn');
    const resetBtn = document.getElementById('reset-btn');
    const enforceConstraintsToggle = document.getElementById('enforce-constraints');
    
    // Check if all DOM elements are found
    if (!wordGrid) console.error('Word grid element not found');
    if (!keyboard) console.error('Keyboard element not found');
    if (!addRowBtn) console.error('Add row button not found');
    if (!resetBtn) console.error('Reset button not found');
    if (!enforceConstraintsToggle) console.error('Enforce constraints toggle not found');
    
    // Initialize the app
    initializeApp();
    
    function initializeApp() {
        console.log('Initializing app');
        createKeyboard();
        addNewRow();
        setupEventListeners();
        console.log('App initialization complete');
    }
    
    function setupEventListeners() {
        if (addRowBtn) {
            addRowBtn.addEventListener('click', function(e) {
                console.log('Add row button clicked');
                addNewRow();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', function(e) {
                console.log('Reset button clicked');
                resetAll();
            });
        }
        
        // Keyboard input listener
        document.addEventListener('keydown', function(e) {
            console.log('Key pressed:', e.key);
            handleKeyInput(e.key);
        });
    }
    
    function handleKeyInput(key) {
        console.log('Handling key input:', key);
        const letter = key.toLowerCase();
        const rows = document.querySelectorAll('.word-row');
        
        console.log('Current row index:', currentRowIndex, 'Total rows:', rows.length);
        
        // Make sure we have a valid row to work with
        if (currentRowIndex < 0 || currentRowIndex >= rows.length) {
            console.log('Invalid row index');
            return;
        }
        
        const activeRow = rows[currentRowIndex];
        if (!activeRow) {
            console.log('Active row not found');
            return;
        }
        
        // Check if it's a letter
        if (/^[a-z]$/.test(letter)) {
            console.log('Valid letter input:', letter);
            const emptyBoxes = Array.from(activeRow.querySelectorAll('.letter-box:not(.filled)'));
            console.log('Empty boxes found:', emptyBoxes.length);
            
            if (emptyBoxes.length > 0) {
                const targetBox = emptyBoxes[0];
                console.log('Target box:', targetBox);
                
                // Check constraints if enabled
                if (enforceConstraintsToggle && enforceConstraintsToggle.checked) {
                    const position = parseInt(targetBox.dataset.position);
                    
                    // If we know this position must have a specific letter
                    if (letterPositions[position] && letterPositions[position] !== letter) {
                        showMessage(`Position ${position + 1} must contain '${letterPositions[position].toUpperCase()}'`);
                        return;
                    }
                    
                    // If we know this letter can't be in this position
                    if (excludedPositions[letter] && excludedPositions[letter].includes(position)) {
                        showMessage(`'${letter.toUpperCase()}' can't be in position ${position + 1}`);
                        return;
                    }
                }
                
                targetBox.textContent = letter.toUpperCase();
                targetBox.classList.add('filled');
                console.log('Letter added:', letter);
            }
        } else if (key === 'Backspace' || key === 'backspace') {
            console.log('Backspace pressed');
            const filledBoxes = Array.from(activeRow.querySelectorAll('.letter-box.filled'));
            
            if (filledBoxes.length > 0) {
                const lastFilledBox = filledBoxes[filledBoxes.length - 1];
                lastFilledBox.textContent = '';
                lastFilledBox.classList.remove('filled');
                lastFilledBox.classList.remove('correct', 'present', 'absent');
                console.log('Letter removed');
            }
        }
    }
    
    function createKeyboard() {
        console.log('Creating keyboard');
        if (!keyboard) {
            console.error('Keyboard element not found, cannot create keyboard');
            return;
        }

        // Clear any existing keyboard
        keyboard.innerHTML = '';
        
        const keyboardLayout = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm']
        ];
        
        keyboardLayout.forEach((row, rowIndex) => {
            const keyboardRow = document.createElement('div');
            keyboardRow.classList.add('keyboard-row');
            
            row.forEach(key => {
                const keyElement = document.createElement('div');
                keyElement.classList.add('key');
                keyElement.textContent = key.toUpperCase();
                keyElement.dataset.key = key;
                
                // Use a more explicit event listener to avoid scope issues
                keyElement.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Key clicked:', key);
                    handleKeyInput(key);
                });
                
                keyboardRow.appendChild(keyElement);
            });
            
            keyboard.appendChild(keyboardRow);
        });
        
        console.log('Keyboard created with', keyboardLayout.flat().length, 'keys');
    }
    
    function addNewRow() {
        console.log('Adding new row, current index:', currentRowIndex);
        if (!wordGrid) {
            console.error('Word grid not found, cannot add row');
            return;
        }
        
        if (currentRowIndex >= MAX_ROWS) {
            showMessage("Maximum number of rows reached!");
            return;
        }
        
        const row = document.createElement('div');
        row.classList.add('word-row');
        console.log('Row created');
        
        for (let i = 0; i < WORD_LENGTH; i++) {
            const box = document.createElement('div');
            box.classList.add('letter-box');
            box.dataset.position = i;
            
            // Click to cycle through states (empty -> filled -> correct -> present -> absent -> filled)
            box.addEventListener('click', function(e) {
                console.log('Letter box clicked, state:', this.className);
                if (!this.classList.contains('filled')) return;
                
                const letter = this.textContent.toLowerCase();
                
                if (!this.classList.contains('correct') && !this.classList.contains('present') && !this.classList.contains('absent')) {
                    // Mark as correct (green)
                    this.classList.add('correct');
                    updateLetterState(letter, 'correct');
                    
                    // Record correct position
                    letterPositions[parseInt(this.dataset.position)] = letter;
                    
                } else if (this.classList.contains('correct')) {
                    // Mark as present (yellow)
                    this.classList.remove('correct');
                    this.classList.add('present');
                    
                    if (updateLetterState(letter, 'present')) {
                        // Remove from correct positions
                        const position = parseInt(this.dataset.position);
                        if (letterPositions[position] === letter) {
                            delete letterPositions[position];
                        }
                        
                        // Add to excluded positions for this letter
                        if (!excludedPositions[letter]) {
                            excludedPositions[letter] = [];
                        }
                        excludedPositions[letter].push(position);
                    }
                    
                } else if (this.classList.contains('present')) {
                    // Mark as absent (gray)
                    this.classList.remove('present');
                    this.classList.add('absent');
                    updateLetterState(letter, 'absent');
                    
                    // Remove from excluded positions if it's now completely absent
                    if (isLetterAbsent(letter)) {
                        delete excludedPositions[letter];
                    }
                    
                } else if (this.classList.contains('absent')) {
                    // Reset to filled
                    this.classList.remove('absent');
                    updateLetterState(letter, null);
                }
                
                updateKeyboard();
            });
            
            row.appendChild(box);
        }
        
        wordGrid.appendChild(row);
        currentRowIndex++;
        
        // Disable the add row button if we've reached the maximum
        if (currentRowIndex >= MAX_ROWS && addRowBtn) {
            addRowBtn.disabled = true;
        }
    }
    
    function updateLetterState(letter, state) {
        if (!letter) return false;
        
        if (state) {
            letterStates[letter] = state;
        } else {
            delete letterStates[letter];
        }
        
        return true;
    }
    
    function updateKeyboard() {
        console.log('Updating keyboard with letter states:', letterStates);
        const keys = document.querySelectorAll('.key');
        
        keys.forEach(key => {
            const letter = key.dataset.key;
            
            // Reset all classes first
            key.classList.remove('correct', 'present', 'absent');
            
            // Apply the appropriate class
            if (letterStates[letter]) {
                key.classList.add(letterStates[letter]);
                console.log(`Setting key ${letter} to ${letterStates[letter]}`);
            }
        });
    }
    
    function isLetterAbsent(letter) {
        // Check if the letter is marked as absent and not marked as correct or present anywhere
        const allBoxes = document.querySelectorAll('.letter-box');
        let isAbsent = true;
        
        allBoxes.forEach(box => {
            if (box.textContent.toLowerCase() === letter) {
                if (box.classList.contains('correct') || box.classList.contains('present')) {
                    isAbsent = false;
                }
            }
        });
        
        return isAbsent;
    }
    
    function resetAll() {
        // Clear the grid
        wordGrid.innerHTML = '';
        
        // Reset keyboard colors
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            key.classList.remove('correct', 'present', 'absent');
        });
        
        // Reset state
        currentRowIndex = 0;
        letterStates = {};
        letterPositions = {};
        excludedPositions = {};
        
        // Enable add row button
        addRowBtn.disabled = false;
        
        // Add first row
        addNewRow();
    }
    
    function showMessage(message) {
        console.log('Showing message:', message);
        // Simple alert for now, could be improved with a custom message box
        alert(message);
    }
});
