#!/usr/bin/env python
"""
Git Repository Initializer

This script initializes a Git repository in the current directory or a specified path.
It handles initialization, first commit, and basic configuration.
"""

import os
import sys
import subprocess
import argparse
from datetime import datetime

def run_command(command):
    """Run a shell command and return the output."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, e.stderr.strip()

def check_git_installed():
    """Check if Git is installed."""
    success, output = run_command("git --version")
    return success

def init_git_repo(path='.', name=None, email=None):
    """Initialize a Git repository at the specified path."""
    # Change to the target directory
    original_dir = os.getcwd()
    target_dir = os.path.abspath(path)
    
    if not os.path.exists(target_dir):
        print(f"ERROR: Directory {target_dir} does not exist.")
        return False

    os.chdir(target_dir)
    print(f"Initializing Git repository in: {target_dir}")
    
    # Check if .git already exists
    if os.path.exists(os.path.join(target_dir, '.git')):
        print("Git repository already exists in this directory.")
        os.chdir(original_dir)
        return False

    # Initialize repository
    success, output = run_command("git init")
    if not success:
        print(f"Failed to initialize Git repository: {output}")
        os.chdir(original_dir)
        return False
    print("Git repository initialized successfully.")

    # Configure user if provided
    if name:
        success, output = run_command(f'git config user.name "{name}"')
        if success:
            print(f"Git user name set to: {name}")
    
    if email:
        success, output = run_command(f'git config user.email "{email}"')
        if success:
            print(f"Git user email set to: {email}")
    
    # Create .gitignore if it doesn't exist
    gitignore_path = os.path.join(target_dir, '.gitignore')
    if not os.path.exists(gitignore_path):
        try:
            with open(gitignore_path, 'w') as f:
                f.write("# OS generated files\n")
                f.write(".DS_Store\n")
                f.write("Thumbs.db\n")
                f.write("desktop.ini\n")
                f.write("\n# Editor files\n")
                f.write("*.swp\n")
                f.write(".idea/\n")
                f.write(".vscode/\n")
                f.write("*.sublime-*\n")
            print("Created default .gitignore file.")
        except Exception as e:
            print(f"Warning: Could not create .gitignore file: {e}")

    # Add all files
    success, output = run_command("git add .")
    if not success:
        print(f"Warning: Could not add files: {output}")
    else:
        print("All files added to staging area.")

    # Make initial commit
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    success, output = run_command(f'git commit -m "Initial commit - {current_date}"')
    if not success:
        print(f"Warning: Could not create initial commit: {output}")
        print("You may need to set your Git user name and email with:")
        print('  git config --global user.name "Your Name"')
        print('  git config --global user.email "your.email@example.com"')
    else:
        print("Initial commit created successfully.")

    # Return to original directory
    os.chdir(original_dir)
    return True

def main():
    parser = argparse.ArgumentParser(description="Initialize a Git repository in a directory")
    parser.add_argument('-p', '--path', default='.', help='Path to directory for Git initialization (default: current directory)')
    parser.add_argument('-n', '--name', help='Git user name for this repository')
    parser.add_argument('-e', '--email', help='Git user email for this repository')
    
    args = parser.parse_args()
    
    # Check if Git is installed
    if not check_git_installed():
        print("ERROR: Git is not installed or not available in PATH.")
        print("Please install Git first: https://git-scm.com/downloads")
        sys.exit(1)
    
    # Initialize the repository
    success = init_git_repo(args.path, args.name, args.email)
    
    if success:
        print("\nRepository successfully initialized!")
        print("\nNext steps:")
        print("  1. To add a remote repository:")
        print("     git remote add origin <repository-url>")
        print("  2. To push your changes:")
        print("     git push -u origin main")
    else:
        print("\nFailed to initialize repository. See error messages above.")

if __name__ == "__main__":
    main()
