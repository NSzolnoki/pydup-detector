# PyDup Detector

PyDup Detector is a Visual Studio Code extension that helps you detect duplicate code and find Python code gems using similarity analysis.

## Features

- Send the selected code for similarity analysis.
- View similar functions and their details directly in the code editor.

## Installation

1. Install the extension from the Visual Studio Code Marketplace.
2. Configure the extension settings to customize your analysis.

## Usage

### Send Selected Code for Analysis

1. Open a Python file in Visual Studio Code.
2. Select the code you want to analyze.
3. Use the command palette (Shift + Cmd + X on macOS, Shift + Ctrl + X on Windows/Linux) and run the command "PyDup Detector: Send the selected code for analysis."

### View Similar Functions

- Similar functions will be displayed as CodeLens above the selected code.
- Click on the CodeLens items to view more details or additional results.

## Configuration

The extension provides the following configuration settings:

- **API Endpoint**: Set the API endpoint for PyDup Detector.
- **Match Threshold**: Define the minimum match rate for found similar functions.
- **Keybinding**: Configure the keybinding for sending selected code.
- **Usable Libraries**: List of usable libraries installed on the server for analysis.
- **Used Libraries**: List of libraries used for analysis.
- **Search Type**: Choose between "AI model" (pre-trained model using usable libraries) and "AST based search" (looking for similar functions by the Abstract Syntax Tree of your code and the libraries).

## Key Commands

- **PyDup Detector: Send the selected code for analysis**: Send the currently selected code for similarity analysis.
- **View more results**: View additional results when there are more than three similar functions.

## Known Issues

Please check the [GitHub repository](https://github.com/NSzolnoki/pydup-detector/issues) for any known issues.

## Release Notes

For information about the latest updates and release notes, refer to the [CHANGELOG](https://github.com/NSzolnoki/pydup-detector/releases) file.

## Contributing

If you encounter issues or have suggestions, please open an issue on the [GitHub repository](https://github.com/NSzolnoki/pydup-detector). Contributions are welcome!

## License

This extension is licensed under the [MIT License](https://github.com/NSzolnoki/pydup-detector/blob/main/LICENSE).
