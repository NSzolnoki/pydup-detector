// Import necessary modules from the VSCode extension API and axios library
import * as vscode from 'vscode';
import axios from 'axios';

// Create a CodeLens decoration type for displaying information above code
const codeLensProvider = vscode.window.createTextEditorDecorationType({});
// Create a status bar item to show loading information
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

// Declare a variable to hold disposable resources
let codeLensProviderDisposable: vscode.Disposable;

// Activate the extension
export async function activate(context: vscode.ExtensionContext) {
    console.log("START");

    // Function to update usable libraries based on the API response
    async function updateUsableLibraries() {
        const apiEndpoint = vscode.workspace.getConfiguration().get('pyDupDetector.apiEndpoint');
        try {
            // Retrieve used libraries from configuration
            const usedLibraries: string[] = vscode.workspace.getConfiguration().get('pyDupDetector.usedLibraries') || [];

            // Make a request to get available libraries from the API
            const response = await axios.get(`${apiEndpoint}/get_available_libs`);
            const availableLibs = response.data;
            const responseData = JSON.parse(response.data);

            console.log("Libs from response:", response.data);

            // Update the configuration with the available libraries
            await vscode.workspace.getConfiguration().update('pyDupDetector.usableLibraries', responseData, vscode.ConfigurationTarget.Workspace);
            await vscode.workspace.getConfiguration().update('pyDupDetector.usableLibraries', responseData, vscode.ConfigurationTarget.Global);

            // If no used libraries are configured, update the configuration with the available libraries
            if (usedLibraries.length == 0) {
                await vscode.workspace.getConfiguration().update('pyDupDetector.usedLibraries', responseData, vscode.ConfigurationTarget.Workspace);
                await vscode.workspace.getConfiguration().update('pyDupDetector.usedLibraries', responseData, vscode.ConfigurationTarget.Global);
            }
        } catch (error) {
            // Handle errors during the update of usable libraries
            console.error('Error fetching usable libraries:', error);
            vscode.window.showErrorMessage('Error fetching usable libraries. See the developer console for details.');
        }
    }

    // Register a command to send the selected code for similarity analysis
    const sendSelectedCodeCommand = vscode.commands.registerCommand('pydup-detector.sendSelectedCode', async () => {
        // Update usable libraries before making the similarity analysis request
        await updateUsableLibraries();
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            // Display loading message in CodeLens
            const loadingMessage = 'PyDupe Detector: Looking for similar functions...';
            const codeLens = new vscode.CodeLens(editor.selection, {
                title: loadingMessage,
                command: "",
            });

            const document = editor.document;
            const codeLenses: vscode.CodeLens[] = [codeLens];
            editor.setDecorations(codeLensProvider, []);

            // Dispose of the previous code lens provider
            if (codeLensProviderDisposable) {
                codeLensProviderDisposable.dispose();
            }

            // Register a new code lens provider
            codeLensProviderDisposable = vscode.languages.registerCodeLensProvider({ scheme: document.uri.scheme }, {
                provideCodeLenses: () => codeLenses,
            });

            editor.setDecorations(codeLensProvider, codeLenses);

            // Display loading indicator in the status bar
            statusBarItem.text = 'PyDupe Detector: Looking for similar functions...';
            statusBarItem.show();

            // Retrieve selected code, API endpoint, match threshold, and used libraries from settings
            const selectedCode = editor.document.getText(editor.selection);
            const apiEndpoint: string | undefined = vscode.workspace.getConfiguration().get('pyDupDetector.apiEndpoint');
            const searchType: string | undefined = vscode.workspace.getConfiguration().get('pyDupDetector.searchType');
            const matchThreshold: number | undefined = vscode.workspace.getConfiguration().get('pyDupDetector.matchThreshold');
            const usedLibraries: string[] = vscode.workspace.getConfiguration().get('pyDupDetector.usedLibraries') || [];
            var response: any = "";

            if (typeof apiEndpoint === 'string' && typeof matchThreshold === 'number') {
                try {
                    // Prepare payload for the similarity analysis request
                    const payload = JSON.stringify({
                        threshold: matchThreshold / 100,
                        code_snippet: selectedCode,
                        library_names: usedLibraries,
                    });
                    console.log("PAYLOAD: ", payload);
                    if (searchType === "AI model") {
                        // Make a request to find similar functions
                        response = await axios.post(apiEndpoint + "/find_similar_function_with_ai", payload);
                    } else if (searchType === "AST based search") {
                        // Make a request to find similar functions
                        response = await axios.post(apiEndpoint + "/find_similar_function", payload);
                    }
                    console.log(response.data);
                    const exampleResponse = response.data;

                    if (exampleResponse.msg === 'No similar function found') {
                        // Display message in CodeLens if no similar function is found
                        const noSimilarFunctionMessage = 'PyDupe Detector: No similar function found';
                        const codeLens = new vscode.CodeLens(editor.selection, {
                            title: noSimilarFunctionMessage,
                            command: "",
                        });

                        const document = editor.document;
                        const codeLenses: vscode.CodeLens[] = [codeLens];
                        editor.setDecorations(codeLensProvider, []);

                        // Dispose of the previous code lens provider
                        if (codeLensProviderDisposable) {
                            codeLensProviderDisposable.dispose();
                        }

                        // Register a new code lens provider
                        codeLensProviderDisposable = vscode.languages.registerCodeLensProvider({ scheme: document.uri.scheme }, {
                            provideCodeLenses: () => codeLenses,
                        });

                        editor.setDecorations(codeLensProvider, codeLenses);
                    } else if (exampleResponse.length > 0) {
                        // Process other responses as before
                        const libraryName = exampleResponse[0].library_name;
                        const similarity = exampleResponse[0].similarity;
                        const similarFunction = exampleResponse[0].similar_function;

                        console.log(libraryName, similarity, similarFunction);

                        const formattedMessage = `Library: ${libraryName} (Similarity: ${similarity})`;

                        const document = editor.document;
                        const codeLenses: vscode.CodeLens[] = [];
                        editor.setDecorations(codeLensProvider, []);

                        // Dispose of the previous code lens provider
                        if (codeLensProviderDisposable) {
                            codeLensProviderDisposable.dispose();
                        }

                        // Register a new code lens provider
                        codeLensProviderDisposable = vscode.languages.registerCodeLensProvider({ scheme: document.uri.scheme }, {
                            provideCodeLenses: () => codeLenses,
                        });

                        codeLenses.length = 0; // Clear the existing code lenses array
                        console.log("cl length before", codeLenses.length);

                        if (exampleResponse.length > 3) {
                            // Create a CodeLens item for showing additional results
                            const moreResultsCodeLens = new vscode.CodeLens(editor.selection, {
                                title: 'View more ALL results',
                                command: 'extension.viewMoreResults',
                                arguments: [exampleResponse], // Pass the additional results to the command
                            });

                            codeLenses.push(moreResultsCodeLens); // Add the new CodeLens to the array
                        }

                        // Iterate over the response to create new CodeLens instances
                        for (let i = 0; i < Math.min(3, exampleResponse.length); i++) {
                            const result = exampleResponse[i];
                            const libraryName = result.library_name;
                            const similarity = result.similarity;
                            const similarFunction = result.similar_function;

                            const formattedMessage = `Library: ${libraryName} (Similarity: ${similarity})`;

                            // Create a new CodeLens for each similar function
                            const codeLens = new vscode.CodeLens(editor.selection, {
                                title: formattedMessage,
                                command: 'extension.viewDetails',
                                arguments: [similarFunction]
                            });

                            codeLenses.push(codeLens); // Add the new CodeLens to the array
                        }

                        console.log("cl length after", codeLenses.length);
                        editor.setDecorations(codeLensProvider, codeLenses); // Set the new CodeLenses to the editor's decorations

                        // Handle the case where the response is empty
                    } else {
                        console.error('Invalid response format:', exampleResponse);
                        vscode.window.showErrorMessage('Invalid response format. See the developer console for details.');
                    }

                } catch (error: any) {
                    // Handle errors that occurred during the API request
                    if (error instanceof Error) {
                        vscode.window.showErrorMessage('API Error: ' + error.message);
                    } else {
                        vscode.window.showErrorMessage('An unknown error occurred.');
                    }
                } finally {
                    // Hide loading indicator after processing the response
                    statusBarItem.hide();
                }

            } else {
                // Show an error message if the API configuration is invalid
                vscode.window.showErrorMessage('Invalid configuration. Please check API endpoint, match threshold, and usable libraries settings.');
            }
        }
    });

    // Define the result type
    interface match {
        library_name: string;
        similarity: number;
        similar_function: string;
    }

    // Register a command for handling the "View more results" action
    const viewMoreResultsCommand = vscode.commands.registerCommand('extension.viewMoreResults', (additionalResults: match[]) => {
        // Create an HTML file to display additional results
        const panel = vscode.window.createWebviewPanel(
            'additionalResults',
            'Additional Results',
            vscode.ViewColumn.One,
            {}
        );

        // Generate HTML content using additionalResults and set it to the panel
        const content = generateHtmlContent(additionalResults);
        panel.webview.html = content;
    });

    // Subscribe to the new command
    context.subscriptions.push(viewMoreResultsCommand);

    // ...

    // Define a function to generate HTML content based on additional results
    function generateHtmlContent(additionalResults: match[]): string {
        // Customize this function to generate HTML content based on your result type
        // You can use additionalResults to populate the content
        // For example, create a table or list to display the additional results

        // Check if there are additional results
        if (additionalResults.length === 0) {
            return `<html><body><h1>No additional results</h1></body></html>`;
        }

        // Create a table to display the additional results
        const tableRows = additionalResults.map(result => `
            <tr>
                <td>${result.library_name}</td>
                <td>${result.similarity}</td>
                <td>${result.similar_function}</td>
            </tr>
        `).join('');

        return `
            <html>
                <head>
                    <style>
                        table {
                            border-collapse: collapse;
                            width: 100%;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #f2f2f2;
                        }
                    </style>
                </head>
                <body>
                    <h1>Additional Results</h1>
                    <table>
                        <tr>
                            <th>Library Name</th>
                            <th>Similarity</th>
                            <th>Similar Function</th>
                        </tr>
                        ${tableRows}
                    </table>
                </body>
            </html>`;
    }
    // Register the 'extension.viewDetails' command outside the command handler
    vscode.commands.registerCommand('extension.viewDetails', (similarFunction: string) => {
        if (similarFunction) {
            vscode.window.showInformationMessage(similarFunction);
        }
    });



    // Subscribe to extension activation and deactivation events
    context.subscriptions.push(sendSelectedCodeCommand);
    context.subscriptions.push(codeLensProviderDisposable);
    context.subscriptions.push(statusBarItem);
}

// Deactivate the extension when needed
export function deactivate() {
    if (codeLensProviderDisposable) {
        codeLensProviderDisposable.dispose();
    }
    statusBarItem.dispose();
}