export declare type TButton = {
    title?: string;
    command?: string;
    styleClass?: string;
    pluginName?: string;
    isComplex?: boolean;
};
export declare type TButtonLibrary = {
    [name: string]: TButton;
};
export declare class NgxWigToolbarService {
    private _buttonLibrary;
    private _defaultButtonsList;
    setButtons(buttons: string[]): void;
    addStandardButton(name: string, title: string, command: string, styleClass: string): void;
    addCustomButton(name: string, pluginName: string): void;
    getToolbarButtons(buttonsList?: string): {}[];
}
