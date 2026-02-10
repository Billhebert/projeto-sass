/**
 * CSS Class Utilities
 * Helper para trabalhar com classes CSS de forma mais eficiente
 */

/**
 * Combina múltiplas classes CSS condicionalmente
 * @param  {...any} classes - Classes CSS ou objetos com condições
 * @returns {string} - String com classes combinadas
 *
 * @example
 * cn('btn', 'btn-primary') // 'btn btn-primary'
 * cn('btn', { 'btn-active': isActive }) // 'btn btn-active' se isActive for true
 * cn('btn', isActive && 'btn-active') // 'btn btn-active' se isActive for true
 */
export function cn(...classes) {
  return classes
    .flat()
    .filter(Boolean)
    .map((cls) => {
      if (typeof cls === "string") return cls;
      if (typeof cls === "object" && cls !== null) {
        return Object.entries(cls)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
          .join(" ");
      }
      return "";
    })
    .join(" ")
    .trim();
}

/**
 * Gera classes de variantes
 * @param {string} base - Classe base
 * @param {object} variants - Objeto com variantes
 * @returns {string} - String com classes geradas
 *
 * @example
 * variants('btn', { size: 'lg', variant: 'primary' })
 * // 'btn btn-lg btn-primary'
 */
export function variants(base, variantsObj = {}) {
  const classes = [base];

  Object.entries(variantsObj).forEach(([key, value]) => {
    if (value) {
      classes.push(`${base}-${value}`);
    }
  });

  return classes.join(" ");
}

/**
 * Gera classes BEM (Block Element Modifier)
 * @param {string} block - Bloco base
 * @param {string} element - Elemento (opcional)
 * @param {string|object} modifier - Modificador ou objeto com modificadores
 * @returns {string} - String com classes BEM
 *
 * @example
 * bem('card') // 'card'
 * bem('card', 'title') // 'card__title'
 * bem('card', 'title', 'large') // 'card__title card__title--large'
 * bem('card', null, { active: true, disabled: false }) // 'card card--active'
 */
export function bem(block, element, modifier) {
  const base = element ? `${block}__${element}` : block;
  const classes = [base];

  if (modifier) {
    if (typeof modifier === "string") {
      classes.push(`${base}--${modifier}`);
    } else if (typeof modifier === "object") {
      Object.entries(modifier).forEach(([key, value]) => {
        if (value) {
          classes.push(`${base}--${key}`);
        }
      });
    }
  }

  return classes.join(" ");
}

/**
 * Aplica classes condicionalmente baseado em estado
 * @param {string} baseClass - Classe base
 * @param {object} states - Objeto com estados e suas classes
 * @returns {string} - String com classes aplicadas
 *
 * @example
 * state('input', {
 *   error: hasError,
 *   success: isValid,
 *   disabled: isDisabled
 * })
 * // 'input input-error' se hasError for true
 */
export function state(baseClass, states = {}) {
  const classes = [baseClass];

  Object.entries(states).forEach(([stateName, isActive]) => {
    if (isActive) {
      classes.push(`${baseClass}-${stateName}`);
    }
  });

  return classes.join(" ");
}

/**
 * Gera classes responsivas
 * @param {object} breakpoints - Objeto com breakpoints e classes
 * @returns {string} - String com classes responsivas
 *
 * @example
 * responsive({
 *   mobile: 'flex-col',
 *   tablet: 'flex-row',
 *   desktop: 'grid-3'
 * })
 * // 'mobile:flex-col tablet:flex-row desktop:grid-3'
 */
export function responsive(breakpoints = {}) {
  return Object.entries(breakpoints)
    .map(([bp, cls]) => `${bp}:${cls}`)
    .join(" ");
}

export default {
  cn,
  variants,
  bem,
  state,
  responsive,
};
