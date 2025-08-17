import { Logger } from './logger';

export class SelectorProbe {
  private logger = new Logger('SelectorProbe');

  /**
   * Find element using multiple selectors (first match wins)
   */
  findElement(selectors: string[]): Element | null {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          this.logger.debug(`Found element with selector: ${selector}`);
          return element;
        }
      } catch (error) {
        this.logger.warn(`Invalid selector: ${selector}`, error);
      }
    }
    
    this.logger.debug(`No element found with selectors: ${selectors.join(', ')}`);
    return null;
  }

  /**
   * Find all elements using multiple selectors
   */
  findElements(selectors: string[]): Element[] {
    const elements: Element[] = [];
    
    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector);
        elements.push(...Array.from(found));
      } catch (error) {
        this.logger.warn(`Invalid selector: ${selector}`, error);
      }
    }
    
    // Remove duplicates
    const unique = Array.from(new Set(elements));
    this.logger.debug(`Found ${unique.length} unique elements`);
    return unique;
  }

  /**
   * Find element by label proximity (looks for labels near form elements)
   */
  findByLabel(labels: string[], container?: Element): Element | null {
    const searchContainer = container || document;
    
    for (const label of labels) {
      // Try direct label association first
      const labelElement = this.findLabelElement(label, searchContainer as Element);
      if (labelElement) {
        const associated = this.getAssociatedElement(labelElement);
        if (associated) {
          this.logger.debug(`Found element by label association: ${label}`);
          return associated;
        }
      }
      
      // Try proximity-based search
      const proximityElement = this.findByProximity(label, searchContainer as Element);
      if (proximityElement) {
        this.logger.debug(`Found element by proximity: ${label}`);
        return proximityElement;
      }
    }
    
    this.logger.debug(`No element found by labels: ${labels.join(', ')}`);
    return null;
  }

  /**
   * Find element by text content proximity
   */
  findByProximity(searchText: string, container: Element | Document = document): Element | null {
    const searchLower = searchText.toLowerCase();
    
    // Find all text nodes containing the search text
    const textNodes = this.findTextNodes(container as Element, searchLower);
    
    for (const textNode of textNodes) {
      const parentElement = textNode.parentElement;
      if (!parentElement) continue;
      
      // Look for form elements near this text
      const nearbyElements = this.findNearbyFormElements(parentElement);
      
      for (const element of nearbyElements) {
        if (this.isRelevantFormElement(element)) {
          this.logger.debug(`Found element by proximity to text: ${searchText}`);
          return element;
        }
      }
    }
    
    return null;
  }

  /**
   * Find elements by ARIA attributes
   */
  findByAria(ariaLabels: string[]): Element | null {
    for (const label of ariaLabels) {
      // Try aria-label
      let element = document.querySelector(`[aria-label*="${label}" i]`);
      if (element) {
        this.logger.debug(`Found element by aria-label: ${label}`);
        return element;
      }
      
      // Try aria-labelledby
      const labelElement = document.querySelector(`[aria-labelledby*="${label}" i]`);
      if (labelElement) {
        this.logger.debug(`Found element by aria-labelledby: ${label}`);
        return labelElement;
      }
      
      // Try aria-describedby
      element = document.querySelector(`[aria-describedby*="${label}" i]`);
      if (element) {
        this.logger.debug(`Found element by aria-describedby: ${label}`);
        return element;
      }
    }
    
    return null;
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(selectors: string[], timeout = 10000): Promise<Element | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = this.findElement(selectors);
      if (element) {
        return element;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.warn(`Timeout waiting for element: ${selectors.join(', ')}`);
    return null;
  }

  /**
   * Check if element is visible
   */
  isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0'
    );
  }

  /**
   * Get element's computed style properties
   */
  getElementInfo(element: Element): object {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    
    return {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.slice(0, 100),
      visible: this.isVisible(element),
      position: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      style: {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity
      }
    };
  }

  /**
   * Find label element by text content
   */
  private findLabelElement(labelText: string, container: Element): Element | null {
    // Build selector patterns for manual search
    
    // Since :contains() is not standard, we'll search manually
    const labels = container.querySelectorAll('label, .label, [data-label]');
    
    for (const label of labels) {
      const text = label.textContent?.toLowerCase() || '';
      const dataLabel = label.getAttribute('data-label')?.toLowerCase() || '';
      
      if (text.includes(labelText.toLowerCase()) || dataLabel.includes(labelText.toLowerCase())) {
        return label;
      }
    }
    
    return null;
  }

  /**
   * Get form element associated with a label
   */
  private getAssociatedElement(labelElement: Element): Element | null {
    // Try for attribute
    const forAttribute = labelElement.getAttribute('for');
    if (forAttribute) {
      const associated = document.getElementById(forAttribute);
      if (associated) return associated;
    }
    
    // Try nested form element
    const nested = labelElement.querySelector('input, select, textarea');
    if (nested) return nested;
    
    // Try next sibling
    let sibling = labelElement.nextElementSibling;
    while (sibling) {
      if (this.isRelevantFormElement(sibling)) {
        return sibling;
      }
      sibling = sibling.nextElementSibling;
    }
    
    return null;
  }

  /**
   * Find text nodes containing specific text
   */
  private findTextNodes(container: Element, searchText: string): Text[] {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent?.toLowerCase() || '';
          return text.includes(searchText) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const textNodes: Text[] = [];
    let node: Node | null;
    
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    
    return textNodes;
  }

  /**
   * Find form elements near a given element
   */
  private findNearbyFormElements(element: Element): Element[] {
    const formElements: Element[] = [];
    const searchDistance = 3; // How many levels up/down to search
    
    // Search in parent hierarchy
    let parent = element.parentElement;
    let level = 0;
    
    while (parent && level < searchDistance) {
      const found = parent.querySelectorAll('input, select, textarea, button');
      formElements.push(...Array.from(found));
      parent = parent.parentElement;
      level++;
    }
    
    // Search in children
    const children = element.querySelectorAll('input, select, textarea, button');
    formElements.push(...Array.from(children));
    
    // Search in siblings
    let sibling = element.previousElementSibling;
    level = 0;
    while (sibling && level < searchDistance) {
      if (this.isRelevantFormElement(sibling)) {
        formElements.push(sibling);
      }
      const found = sibling.querySelectorAll('input, select, textarea, button');
      formElements.push(...Array.from(found));
      sibling = sibling.previousElementSibling;
      level++;
    }
    
    sibling = element.nextElementSibling;
    level = 0;
    while (sibling && level < searchDistance) {
      if (this.isRelevantFormElement(sibling)) {
        formElements.push(sibling);
      }
      const found = sibling.querySelectorAll('input, select, textarea, button');
      formElements.push(...Array.from(found));
      sibling = sibling.nextElementSibling;
      level++;
    }
    
    return formElements;
  }

  /**
   * Check if element is a relevant form element
   */
  private isRelevantFormElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    
    if (!['input', 'select', 'textarea'].includes(tagName)) {
      return false;
    }
    
    const inputType = (element as HTMLInputElement).type?.toLowerCase();
    const excludedTypes = ['hidden', 'submit', 'button', 'reset'];
    
    if (tagName === 'input' && excludedTypes.includes(inputType)) {
      return false;
    }
    
    return this.isVisible(element);
  }
}
