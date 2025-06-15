// Wordle Helper Script - Complete Rewrite
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
    
    // Initialize the app
    createKeyboard();
    addNewRow();
    setupEventListeners();
    
    function setupEventListeners() {
        // Add row button
        addRowBtn.addEventListener('click', function() {
            addNewRow();
        });
        
        // Reset button
        resetBtn.addEventListener('click', function() {
            resetAll();
        });
        
        // Physical keyboard input
        document.addEventListener('keydown', function(e) {
            console.log('Key pressed:', e.key);
            
            // Check if it's a letter (a-z)
            if (/^[a-z]$/i.test(e.key)) {
                insertLetter(e.key.toLowerCase());
            } 
            // Or backspace - note that e.key will be 'Backspace' (capitalized)
            else if (e.key === 'Backspace') {
                removeLetter();
            }
        });
    }
    
    function insertLetter(letter) {
        console.log('Inserting letter:', letter);
        
        // Flash the corresponding key on the virtual keyboard
        const keyElement = document.querySelector(`.key[data-key="${letter}"]`);
        if (keyElement) {
            keyElement.style.backgroundColor = '#4285f4';
            setTimeout(() => {
                keyElement.style.backgroundColor = '';
            }, 100);
        }
        
        // Get current row
        const rows = document.querySelectorAll('.word-row');
        console.log('Found rows:', rows.length, 'Current index:', currentRowIndex);
        
        if (currentRowIndex >= rows.length) {
            console.log('Invalid row index');
            return;
        }
        
        const currentRow = rows[currentRowIndex];
        if (!currentRow) {
            console.log('Current row not found');
            return;
        }
        
        // Find first empty box in the row
        const emptyBoxes = Array.from(currentRow.querySelectorAll('.letter-box:not(.filled)'));
        console.log('Empty boxes:', emptyBoxes.length);
        
        if (emptyBoxes.length === 0) {
            console.log('No empty boxes available');
            return;
        }
        
        const targetBox = emptyBoxes[0];
        console.log('Target box:', targetBox);
        const position = parseInt(targetBox.dataset.position);
        
        // Check constraints if enabled
        if (enforceConstraintsToggle.checked) {
            // If we know this position must have a specific letter
            if (letterPositions[position] && letterPositions[position] !== letter) {
                alert(`Position ${position + 1} must contain '${letterPositions[position].toUpperCase()}'`);
                return;
            }
            
            // If we know this letter can't be in this position
            if (excludedPositions[letter] && excludedPositions[letter].includes(position)) {
                alert(`'${letter.toUpperCase()}' can't be in position ${position + 1}`);
                return;
            }
        }
        
        // Insert the letter
        targetBox.textContent = letter.toUpperCase();
        targetBox.classList.add('filled');
    }
    
    function removeLetter() {
        // Get current row
        const rows = document.querySelectorAll('.word-row');
        if (currentRowIndex >= rows.length) return;
        
        const currentRow = rows[currentRowIndex];
        if (!currentRow) return;
        
        // Find the last filled box
        const filledBoxes = Array.from(currentRow.querySelectorAll('.letter-box.filled'));
        if (filledBoxes.length === 0) return;
        
        const lastFilledBox = filledBoxes[filledBoxes.length - 1];
        
        // Clear the box
        lastFilledBox.textContent = '';
        lastFilledBox.classList.remove('filled', 'correct', 'present', 'absent');
    }
    
    function createKeyboard() {
        const keyboardLayout = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm']
        ];
        
        keyboardLayout.forEach(row => {
            const keyboardRow = document.createElement('div');
            keyboardRow.classList.add('keyboard-row');
            
            row.forEach(key => {
                const keyElement = document.createElement('div');
                keyElement.classList.add('key');
                keyElement.textContent = key.toUpperCase();
                keyElement.setAttribute('data-key', key);
                
                // On-screen keyboard click
                keyElement.addEventListener('click', function() {
                    insertLetter(key);
                });
                
                keyboardRow.appendChild(keyElement);
            });
            
            keyboard.appendChild(keyboardRow);
        });
    }
    
    function addNewRow() {
        if (currentRowIndex >= MAX_ROWS) {
            alert("Maximum number of rows reached!");
            return;
        }
        
        const row = document.createElement('div');
        row.classList.add('word-row');
        
        for (let i = 0; i < WORD_LENGTH; i++) {
            const box = document.createElement('div');
            box.classList.add('letter-box');
            box.setAttribute('data-position', i);
            
            // Click to cycle through states
            box.addEventListener('click', function() {
                if (!this.classList.contains('filled')) return;
                
                const letter = this.textContent.toLowerCase();
                
                // Cycle through states: filled -> correct -> present -> absent -> filled
                if (!this.classList.contains('correct') && 
                    !this.classList.contains('present') && 
                    !this.classList.contains('absent')) {
                    
                    // Mark as correct (green)
                    this.classList.add('correct');
                    updateLetterState(letter, 'correct');
                    
                    // Record correct position
                    letterPositions[parseInt(this.dataset.position)] = letter;
                    
                } else if (this.classList.contains('correct')) {
                    // Change to present (yellow)
                    this.classList.remove('correct');
                    this.classList.add('present');
                    
                    // Update state and constraints
                    updateLetterState(letter, 'present');
                    
                    // Remove from correct positions
                    const position = parseInt(this.dataset.position);
                    if (letterPositions[position] === letter) {
                        delete letterPositions[position];
                    }
                    
                    // Add to excluded positions
                    if (!excludedPositions[letter]) {
                        excludedPositions[letter] = [];
                    }
                    excludedPositions[letter].push(position);
                    
                } else if (this.classList.contains('present')) {
                    // Change to absent (gray)
                    this.classList.remove('present');
                    this.classList.add('absent');
                    updateLetterState(letter, 'absent');
                    
                } else if (this.classList.contains('absent')) {
                    // Reset to just filled
                    this.classList.remove('absent');
                    updateLetterState(letter, null);
                }
                
                // Update keyboard colors
                updateKeyboard();
            });
            
            row.appendChild(box);
        }
        
        wordGrid.appendChild(row);
        currentRowIndex++;
        
        // Disable the add row button if we've reached the maximum
        if (currentRowIndex >= MAX_ROWS) {
            addRowBtn.disabled = true;
        }
    }
    
    function updateLetterState(letter, state) {
        if (!letter) return;
        
        if (state) {
            letterStates[letter] = state;
        } else {
            delete letterStates[letter];
        }
    }
    
    function updateKeyboard() {
        const keys = document.querySelectorAll('.key');
        
        keys.forEach(key => {
            const letter = key.getAttribute('data-key');
            
            // Reset all classes first
            key.classList.remove('correct', 'present', 'absent');
            
            // Apply the appropriate class
            if (letterStates[letter]) {
                key.classList.add(letterStates[letter]);
            }
        });
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
});
