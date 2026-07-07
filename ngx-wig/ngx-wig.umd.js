(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/common'), require('@angular/forms')) :
	typeof define === 'function' && define.amd ? define(['exports', '@angular/core', '@angular/common', '@angular/forms'], factory) :
	(factory((global['ngx-wig'] = {}),global.core,global.common,global.forms));
}(this, (function (exports,core,common,forms) { 'use strict';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var NgxWigToolbarService = (function () {
    function NgxWigToolbarService() {
        this._buttonLibrary = {
            list1: { title: 'Unordered List', command: 'insertunorderedlist', styleClass: 'list-ul' },
            list2: { title: 'Ordered List', command: 'insertorderedlist', styleClass: 'list-ol' },
            bold: { title: 'Bold', command: 'bold', styleClass: 'bold' },
            italic: { title: 'Italic', command: 'italic', styleClass: 'italic' },
            link: { title: 'Link', command: 'createlink', styleClass: 'link' },
            underline: { title: 'Underline', command: 'underline', styleClass: 'format-underlined' }
        };
        this._defaultButtonsList = ['list1', 'list2', 'bold', 'underline', 'italic', 'link'];
    }
    /**
     * @param {?} buttons
     * @return {?}
     */
    NgxWigToolbarService.prototype.setButtons = /**
     * @param {?} buttons
     * @return {?}
     */
    function (buttons) {
        // if(!angular.isArray(buttons)) {
        //   throw 'Argument "buttons" should be an array';
        // }
        this._defaultButtonsList = buttons;
    };

    /**
     * @param {?} name
     * @param {?} title
     * @param {?} command
     * @param {?} styleClass
     * @return {?}
     */
    NgxWigToolbarService.prototype.addStandardButton = /**
     * @param {?} name
     * @param {?} title
     * @param {?} command
     * @param {?} styleClass
     * @return {?}
     */
    function (name, title, command, styleClass) {
        if (!name || !title || !command) {
            throw 'Arguments "name", "title" and "command" are required';
        }
        styleClass = styleClass || '';
        this._buttonLibrary[name] = { title: title, command: command, styleClass: styleClass };
        this._defaultButtonsList.push(name);
    };
    /**
     * @param {?} name
     * @param {?} pluginName
     * @return {?}
     */
    NgxWigToolbarService.prototype.addCustomButton = /**
     * @param {?} name
     * @param {?} pluginName
     * @return {?}
     */
    function (name, pluginName) {
        if (!name || !pluginName) {
            throw 'Arguments "name" and "pluginName" are required';
        }
        this._buttonLibrary[name] = { pluginName: pluginName, isComplex: true };
        this._defaultButtonsList.push(name);
    };
    /**
     * @param {?=} buttonsList
     * @return {?}
     */
    NgxWigToolbarService.prototype.getToolbarButtons = /**
     * @param {?=} buttonsList
     * @return {?}
     */
    function (buttonsList) {
        var _this = this;
        var /** @type {?} */ buttons = this._defaultButtonsList;
        var /** @type {?} */ toolbarButtons = [];
        if (typeof buttonsList !== 'undefined') {
            buttons = string2array(buttonsList);
        }
        buttons.forEach(function (buttonKey) {
            if (!buttonKey) {
                return;
            }
            if (!_this._buttonLibrary[buttonKey]) {
                throw 'There is no "' + buttonKey + '" in your library. Possible variants: ' + Object.keys(_this._buttonLibrary);
            }
            var /** @type {?} */ button = Object.assign({}, _this._buttonLibrary[buttonKey]);
            // button.isActive = () => {return !!this.command && document.queryCommandState(this.command);}
            toolbarButtons.push(button);
        });
        return toolbarButtons;
    };
    return NgxWigToolbarService;
}());
/**
 * @param {?} keysString
 * @return {?}
 */
function string2array(keysString) {
    return keysString.split(',').map(Function.prototype.call, String.prototype.trim);
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var NgxWigComponent = (function () {
    function NgxWigComponent(_ngWigToolbarService) {
        this._ngWigToolbarService = _ngWigToolbarService;
        this.isSourceModeAllowed = false;
        this.contentChange = new core.EventEmitter();
        this.editMode = false;
        this.toolbarButtons = [];
        this.hasFocus = false;
        this.propagateChange = function (_) { };
        this.propagateTouched = function () { };
        // hardcoded icons theme for now
        this.iconsTheme = "nw-button-fa";
    }
    /**
     * @return {?}
     */
    NgxWigComponent.prototype.toggleEditMode = /**
     * @return {?}
     */
    function () {
        this.editMode = !this.editMode;
    };
    /**
     * @param {?} command
     * @param {?} options
     * @return {?}
     */
    NgxWigComponent.prototype.execCommand = /**
     * @param {?} command
     * @param {?} options
     * @return {?}
     */
    function (command, options) {
        if (this.editMode) {
            return false;
        }
        if (document.queryCommandSupported && !document.queryCommandSupported(command)) {
            throw 'The command "' + command + '" is not supported';
        }
        if (command === 'createlink' || command === 'insertImage') {
            options = window.prompt('Please enter the URL', 'http://');
            if (!options) {
                return;
            }
        }
        this.container.focus();
        // use insertHtml for `createlink` command to account for IE/Edge purposes, in case there is no selection
        var /** @type {?} */ selection = document.getSelection().toString();
        if (command === 'createlink' && selection === '') {
            document.execCommand('insertHtml', false, '<a href="' + options + '">' + options + '</a>');
        }
        else {
            document.execCommand(command, false, options);
        }
        this.onContentChange(this.container.innerHTML);
    };
    /**
     * @return {?}
     */
    NgxWigComponent.prototype.ngOnInit = /**
     * @return {?}
     */
    function () {
        this.toolbarButtons = this._ngWigToolbarService.getToolbarButtons(this.buttons);
        this.container = this.ngxWigEditable.nativeElement;
        if (this.content) {
            this.container.innerHTML = this.content;
        }
    };
    /**
     * @param {?} newContent
     * @return {?}
     */
    NgxWigComponent.prototype.onContentChange = /**
     * @param {?} newContent
     * @return {?}
     */
    function (newContent) {
        this.content = newContent;
        this.contentChange.emit(this.content);
        this.propagateChange(this.content);
    };
    /**
     * @param {?} changes
     * @return {?}
     */
    NgxWigComponent.prototype.ngOnChanges = /**
     * @param {?} changes
     * @return {?}
     */
    function (changes) {
        if (this.container && changes['content']) {
            // clear the previous content
            this.container.innerHTML = '';
            // add the new content
            this.pasteHtmlAtCaret(changes['content'].currentValue);
        }
    };
    /**
     * @param {?} newContent
     * @return {?}
     */
    NgxWigComponent.prototype.onTextareaChange = /**
     * @param {?} newContent
     * @return {?}
     */
    function (newContent) {
        // model -> view
        this.container.innerHTML = newContent;
        this.onContentChange(newContent);
    };
    /**
     * @param {?} value
     * @return {?}
     */
    NgxWigComponent.prototype.writeValue = /**
     * @param {?} value
     * @return {?}
     */
    function (value) {
        if (!value) {
            value = '';
        }
        this.container.innerHTML = value;
        this.onContentChange(value);
    };
    /**
     * @return {?}
     */
    NgxWigComponent.prototype.shouldShowPlaceholder = /**
     * @return {?}
     */
    function () {
        return this.placeholder
            && !this.container.innerText;
    };
    /**
     * @param {?} html
     * @return {?}
     */
    NgxWigComponent.prototype.pasteHtmlAtCaret = /**
     * @param {?} html
     * @return {?}
     */
    function (html) {
        var /** @type {?} */ sel, /** @type {?} */ range;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();
                // append the content in a temporary div
                var /** @type {?} */ el = document.createElement('div');
                el.innerHTML = html;
                var /** @type {?} */ frag = document.createDocumentFragment(), /** @type {?} */ node = void 0, /** @type {?} */ lastNode = void 0;
                while ((node = el.firstChild)) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);
                // Preserve the selection
                if (lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }
    };
    /**
     * @param {?} fn
     * @return {?}
     */
    NgxWigComponent.prototype.registerOnChange = /**
     * @param {?} fn
     * @return {?}
     */
    function (fn) {
        this.propagateChange = fn;
    };
    /**
     * @param {?} fn
     * @return {?}
     */
    NgxWigComponent.prototype.registerOnTouched = /**
     * @param {?} fn
     * @return {?}
     */
    function (fn) {
        this.propagateTouched = fn;
    };
    /**
     * @return {?}
     */
    NgxWigComponent.prototype.onBlur = /**
     * @return {?}
     */
    function () {
        this.hasFocus = false;
        this.propagateTouched();
    };
    /**
     * @param {?} isDisabled
     * @return {?}
     */
    NgxWigComponent.prototype.setDisabledState = /**
     * @param {?} isDisabled
     * @return {?}
     */
    function (isDisabled) {
        this.disabled = isDisabled;
    };
    NgxWigComponent.decorators = [
        { type: core.Component, args: [{
                    selector: 'ngx-wig',
                    template: "<div class=\"ng-wig\"> <ul *ngIf=\"toolbarButtons.length\" class=\"nw-toolbar\"> <li *ngFor=\"let button of toolbarButtons\" class=\"nw-toolbar__item\"> <div *ngIf=\"!button.isComplex\"> <button type=\"button\" class=\"nw-button\" [ngClass]=\"[button.styleClass, iconsTheme]\" [title]=\"button.title\" (click)=\"execCommand(button.command)\" [disabled]=\"disabled\" tabindex=\"-1\"> {{ button.title }} </button> </div> </li><!-- --><li class=\"nw-toolbar__item\"> <button type=\"button\" class=\"nw-button nw-button--source\" title=\"Edit HTML\" [class.nw-button--active] = \"editMode\" [ngClass]=\"iconsTheme\" *ngIf=\"isSourceModeAllowed\" (click)=\"toggleEditMode()\" [disabled]=\"disabled\" tabindex=\"-1\"> Edit HTML </button> </li> </ul> <div class=\"nw-editor-container\" (click)=\"container.focus()\" [ngClass]=\"{ 'nw-editor-container--with-toolbar': toolbarButtons.length }\"> <div *ngIf=\"editMode\" class=\"nw-editor__src-container\"> <textarea [ngModel]=\"content\" (ngModelChange)=\"onTextareaChange($event)\" (blur)=\"propagateTouched()\" class=\"nw-editor__src\"> </textarea> </div> <div class=\"nw-editor\" [ngClass]=\"{ 'nw-disabled': disabled,'nw-invisible': editMode }\"> <div *ngIf=\"shouldShowPlaceholder()\" class=\"nw-editor__placeholder\" [innerText]=\"placeholder\"> </div> <div #ngWigEditable class=\"nw-editor__res\" [attr.contenteditable]=\"!disabled\" [ngClass]=\"{ disabled: disabled}\" (focus)=\"hasFocus = true\" (blur)=\"onBlur()\" (input)=\"onContentChange(ngWigEditable.innerHTML)\"><!-- --></div> </div> </div> </div> ",
                    styles: ["/* -------- NG-WIG -------- */ /** * *  RESET BOX MODEL * */ .ng-wig, [class^=\"nw-\"] { -webkit-box-sizing: border-box; -moz-box-sizing: border-box; -o-box-sizing: border-box; -ms-box-sizing: border-box; box-sizing: border-box; } /** *   main wrapper for the editor * *  .ngx-wig * */ .ng-wig { display: block; padding: 0; margin: 0; } /** *  styling for toolbar and its items * *  .nw-toolbar *    &__item * */ .nw-toolbar { display: block; margin: 0; padding: 0; list-style: none; font-size: 12px; color: #6B7277; background: -webkit-linear-gradient(90deg, #ffffff 0%, #f9f9f9 100%); background: -moz-linear-gradient(90deg, #ffffff 0%, #f9f9f9 100%); background: linear-gradient(180deg, #ffffff 0%, #f9f9f9 100%); border: 1px solid #CCCCCC; border-radius: 3px 3px 0 0; } .nw-toolbar__item { display: inline-block; vertical-align: top; margin: 0; border-right: 1px solid #DEDEDE; } .nw-toolbar label { line-height: 30px; display: inline-block; padding: 0 6px 0 3px; } .nw-toolbar input[type=checkbox] { vertical-align: -3px; margin-right: -1px; } /** *  styling for the editor part: source code (original textarea) and resulting div * *  .nw-editor *    &__src *    &__res * */ .nw-editor { /* Default when height is not set */ display: block; position: relative; height: 300px; background: #fff; cursor: text; width: 100%; overflow-y: auto; } .nw-editor-container { border: 1px solid #CCCCCC; border-radius: 0 0 3px 3px; position: relative; } .nw-editor-container--with-toolbar { border-top: none; } .nw-editor__res { display: block; min-height: 100%; padding: 1px 8px; } .nw-editor__placeholder { display: block; position: absolute; padding: 1px 8px; color: lightgray; width: 100%; } .nw-editor__src, .nw-editor__res { width: 100%; outline: none; box-sizing: border-box; border: none; margin: 0; } .nw-editor__res.disabled { opacity: 0.5; } .nw-editor__src-container { position: absolute; left: 0; top: 0; right: 0; bottom: 0; } .nw-editor__src { height: 100%; resize: none; padding: 1px 8px; } .nw-editor--fixed .nw-editor { display: block; overflow-y: auto; } .nw-editor--fixed .nw-editor__res { padding: 1px 8px; display: block; } .nw-invisible { visibility: hidden; } .nw-editor--fixed .nw-invisible { display: none; } .nw-editor.nw-disabled { cursor: default; } /** *  styling for toolbar button, has two modifiers: active and type of icon for background * *  .nw-button *    &--active *    &--{button type} * */ .nw-button { -webkit-appearance: none; -moz-appearance: none; appearance: none; display: block; width: 30px; height: 30px; margin: 0; padding: 0; opacity: 0.5; line-height: 30px; background-color: transparent; background-position: center center; background-repeat: no-repeat; border: none; border-radius: 2px; font-size: 0; cursor: pointer; } .nw-button-fa:before { font-size: 12px; font-family: FontAwesome; } .nw-button-fa.bold:before { content: '\\f032'; } .nw-button-fa.italic:before { content: '\\f033'; } .nw-button-fa.list-ul:before { content: '\\f0ca'; } .nw-button-fa.list-ol:before { content: '\\f0cb'; } .nw-button-fa.link:before { content: '\\f0c1'; } .nw-button-fa.format-underlined:before { content: '\\f0cd'; } .nw-button-fa.font-color:before { content: '\\f031'; } .nw-button-fa.nw-button--source:before { content: '\\f040'; } .nw-button-fa.clear-styles:before { content: '\\f12d'; } .nw-button-mdi:before { vertical-align: middle; font-size: 14px; font-family: \"FontAwesome\"; } .nw-button-mdi.bold:before { content: '\\f032'; } .nw-button-mdi.italic:before { content: '\\f277'; } .nw-button-mdi.list-ul:before { content: '\\f279'; } .nw-button-mdi.list-ol:before { content: '\\f27B'; } .nw-button-mdi.link:before { content: '\\f339'; } .nw-button-mdi.format-underlined:before { content: '\\f287'; } .nw-button-mdi.font-color:before { content: '\\f6D5'; } .nw-button-mdi.nw-button--source:before { content: '\\f3EB'; } .nw-button-mdi.clear-styles:before { content: '\\f1fE'; } .nw-button:focus { outline: none; } .nw-button:hover, .nw-button.nw-button--active { opacity: 1 } .nw-button--active { background-color: #EEEEEE; } .nw-button:disabled { cursor: default; } .nw-button:disabled:hover { opacity: 0.5; } /** *  styling & formatting of content inside contenteditable div * *  .nw-content * */ .nw-content { padding: 12px; margin: 0; font-family: sans-serif; font-size: 14px; line-height: 24px; } .nw-select { height: 30px; padding: 6px; color: #555; background-color: inherit; border: 0; } .nw-select:disabled { opacity: 0.5; } .nw-select:focus { outline: none; } .nw-button:focus { border-color: lightgray; border-style: solid; } [contenteditable]:empty:before { content: attr(placeholder); color: grey; display: inline-block; } "],
                    providers: [
                        NgxWigToolbarService,
                        {
                            provide: forms.NG_VALUE_ACCESSOR,
                            useExisting: core.forwardRef(function () { return NgxWigComponent; }),
                            multi: true
                        }
                    ],
                    encapsulation: core.ViewEncapsulation.None
                },] },
    ];
    /** @nocollapse */
    NgxWigComponent.ctorParameters = function () { return [
        { type: NgxWigToolbarService, },
    ]; };
    NgxWigComponent.propDecorators = {
        "content": [{ type: core.Input },],
        "placeholder": [{ type: core.Input },],
        "buttons": [{ type: core.Input },],
        "disabled": [{ type: core.Input },],
        "isSourceModeAllowed": [{ type: core.Input },],
        "contentChange": [{ type: core.Output },],
        "ngxWigEditable": [{ type: core.ViewChild, args: ['ngWigEditable',] },],
    };
    return NgxWigComponent;
}());

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
var NgxWigModule = (function () {
    function NgxWigModule() {
    }
    NgxWigModule.decorators = [
        { type: core.NgModule, args: [{
                    imports: [
                        common.CommonModule,
                        forms.FormsModule,
                        forms.ReactiveFormsModule
                    ],
                    declarations: [
                        NgxWigComponent,
                    ],
                    exports: [
                        NgxWigComponent,
                    ],
                    providers: [NgxWigToolbarService]
                },] },
    ];
    return NgxWigModule;
}());

exports.NgxWigModule = NgxWigModule;
exports.NgxWigComponent = NgxWigComponent;
exports.NgxWigToolbarService = NgxWigToolbarService;

Object.defineProperty(exports, '__esModule', { value: true });

})));
