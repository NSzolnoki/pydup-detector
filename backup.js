import * as vscode from 'vscode';
import axios from 'axios';

// Define a decoration type for the code lenses
const codeLensProvider = vscode.window.createTextEditorDecorationType({
    // Define the appearance of the code lens decorations
});

let codeLensProviderDisposable: vscode.Disposable;


// Register the 'extension.viewDetails' command outside the command handler
vscode.commands.registerCommand('extension.viewDetails', (similarFunction: string) => {
    if (similarFunction) {
        vscode.window.showInformationMessage(similarFunction);
    }
});


export async function activate(context: vscode.ExtensionContext) {
    console.log("START");

    // Fetch available libraries from the API and update configuration
    async function updateUsableLibraries() {
        const apiEndpoint = vscode.workspace.getConfiguration().get('pyDupDetector.apiEndpoint');
        try {

            const usedLibraries: string[] = vscode.workspace.getConfiguration().get('pyDupDetector.usedLibraries') || [];


            console.log(`${apiEndpoint}/get_available_libs`);
            const response = await axios.get(`${apiEndpoint}/get_available_libs`);
            const availableLibs = response.data;
            const responseData = JSON.parse(response.data);

            console.log("Libs from response:", response.data);


            // Update the configuration and populate settings.json
            await vscode.workspace.getConfiguration().update('pyDupDetector.usableLibraries', responseData, vscode.ConfigurationTarget.Workspace);
            await vscode.workspace.getConfiguration().update('pyDupDetector.usableLibraries', responseData, vscode.ConfigurationTarget.Global);
            if (usedLibraries.length == 0) {
                // Update the configuration and populate settings.json
                await vscode.workspace.getConfiguration().update('pyDupDetector.usedLibraries', responseData, vscode.ConfigurationTarget.Workspace);
                await vscode.workspace.getConfiguration().update('pyDupDetector.usedLibraries', responseData, vscode.ConfigurationTarget.Global);
            }
            // Continue with the rest of your code...
        } catch (error) {
            console.error('Error fetching usable libraries:', error);
            vscode.window.showErrorMessage('Error fetching usable libraries. See the developer console for details.');
        }
    }


    // Register command to send selected code
    const sendSelectedCodeCommand = vscode.commands.registerCommand('pydup-detector.sendSelectedCode', async () => {
        await updateUsableLibraries();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selectedCode = editor.document.getText(editor.selection);

            // Retrieve the API endpoint, match threshold, and usable libraries from settings
            const apiEndpoint: string | undefined = vscode.workspace.getConfiguration().get('pyDupDetector.apiEndpoint');
            const matchThreshold: number | undefined = vscode.workspace.getConfiguration().get('pyDupDetector.matchThreshold');
            const usedLibraries: string[] = vscode.workspace.getConfiguration().get('pyDupDetector.usedLibraries') || [];

            if (typeof apiEndpoint === 'string' && typeof matchThreshold === 'number') {
                try {
                    const payload = JSON.stringify({
                        threshold: matchThreshold / 100,
                        code_snippet: selectedCode,
                        library_names: usedLibraries, // Include usable libraries in the payload
                    });
                    console.log("PAYLOAD: ", payload);

                    const response = await axios.post(apiEndpoint + "/find_similar_function", payload);

                    // Assuming response.data contains the example response data
                    const exampleResponse = response.data;
                    console.log(exampleResponse);

                    // Extract and format the information from the example response
                    const libraryName = exampleResponse[0].library_name;
                    const similarity = exampleResponse[0].similarity;
                    const similarFunction = exampleResponse[0].similar_function;

                    console.log(libraryName, similarity, similarFunction);

                    const formattedMessage = `Library: ${libraryName} (Similarity: ${similarity})`;

                    // Associate the code lens with the document
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

                    codeLenses.length = 0; // Clear existing code lenses

                    console.log("cl length before", codeLenses.length)
                    for (let i = 0; i < Math.min(3, exampleResponse.length); i++) {
                        const result = exampleResponse[i];
                        const libraryName = result.library_name;
                        const similarity = result.similarity;
                        const similarFunction = result.similar_function;

                        const formattedMessage = `Library: ${libraryName} (Similarity: ${similarity})`;

                        const codeLens = new vscode.CodeLens(editor.selection, {
                            title: formattedMessage,
                            command: 'extension.viewDetails',
                            arguments: [similarFunction]
                        });

                        codeLenses.push(codeLens);
                    }
                    console.log("cl length after", codeLenses.length);
                    editor.setDecorations(codeLensProvider, codeLenses);

                } catch (error: any) {
                    // Handle API errors here
                    if (error instanceof Error) {
                        vscode.window.showErrorMessage('API Error: ' + error.message);
                    } else {
                        vscode.window.showErrorMessage('An unknown error occurred.');
                    }
                }
            } else {
                vscode.window.showErrorMessage('Invalid configuration. Please check API endpoint, match threshold, and usable libraries settings.');
            }
        }
    });

    context.subscriptions.push(sendSelectedCodeCommand);
    context.subscriptions.push(codeLensProviderDisposable);
}

export function deactivate() {
    // Dispose of the code lens provider when the extension is deactivated
    if (codeLensProviderDisposable) {
        codeLensProviderDisposable.dispose();
    }
}