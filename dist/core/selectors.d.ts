export declare class SelectorProbe {
    private logger;
    /**
     * Find element using multiple selectors (first match wins)
     */
    findElement(selectors: string[]): Element | null;
    /**
     * Find all elements using multiple selectors
     */
    findElements(selectors: string[]): Element[];
    /**
     * Find element by label proximity (looks for labels near form elements)
     */
    findByLabel(labels: string[], container?: Element): Element | null;
    /**
     * Find element by text content proximity
     */
    findByProximity(searchText: string, container?: Element | Document): Element | null;
    /**
     * Find elements by ARIA attributes
     */
    findByAria(ariaLabels: string[]): Element | null;
    /**
     * Wait for element to appear
     */
    waitForElement(selectors: string[], timeout?: number): Promise<Element | null>;
    /**
     * Check if element is visible
     */
    isVisible(element: Element): boolean;
    /**
     * Get element's computed style properties
     */
    getElementInfo(element: Element): object;
    /**
     * Find label element by text content
     */
    private findLabelElement;
    /**
     * Get form element associated with a label
     */
    private getAssociatedElement;
    /**
     * Find text nodes containing specific text
     */
    private findTextNodes;
    /**
     * Find form elements near a given element
     */
    private findNearbyFormElements;
    /**
     * Check if element is a relevant form element
     */
    private isRelevantFormElement;
}
//# sourceMappingURL=selectors.d.ts.map