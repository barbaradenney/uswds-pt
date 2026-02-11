/**
 * Conditional field reveal/hide script
 * Supports showing/hiding multiple elements based on checkbox/radio selection
 * Use data-reveals and data-hides attributes with comma-separated IDs
 * Example: data-reveals="field1, field2" data-hides="field3"
 */
export const CONDITIONAL_FIELDS_SCRIPT = `
<script>
// Conditional field reveal/hide - shows/hides fields based on radio/checkbox selection
// Use Properties panel: "Show Element (ID)" and "Hide Element (ID)" on checkboxes/radios
// Supports multiple IDs separated by commas (e.g., "field1, field2, field3")
if (!window._conditionalFieldsInit) {
  window._conditionalFieldsInit = true;

  function getElementsFromIds(idString) {
    if (!idString) return [];
    return idString.split(',')
      .map(function(id) { return id.trim(); })
      .filter(function(id) { return id; })
      .map(function(id) { return document.getElementById(id); })
      .filter(function(el) { return el; });
  }

  function initConditionalFields() {
    document.querySelectorAll('[data-reveals], [data-hides]').forEach(function(trigger) {
      if (trigger._conditionalInit) return;
      trigger._conditionalInit = true;

      var revealsIds = trigger.getAttribute('data-reveals');
      var hidesIds = trigger.getAttribute('data-hides');
      var revealsTargets = getElementsFromIds(revealsIds);
      var hidesTargets = getElementsFromIds(hidesIds);

      if (revealsTargets.length === 0 && hidesTargets.length === 0) return;

      var name = trigger.getAttribute('name');
      var isRadio = trigger.tagName.toLowerCase() === 'usa-radio';
      var isCheckbox = trigger.tagName.toLowerCase() === 'usa-checkbox';

      function showElement(target) {
        target.removeAttribute('hidden');
        target.setAttribute('aria-hidden', 'false');
        target.style.display = '';
      }

      function hideElement(target) {
        target.setAttribute('hidden', '');
        target.setAttribute('aria-hidden', 'true');
        target.style.display = 'none';
      }

      // Set initial state: "reveals" targets start hidden, "hides" targets start visible
      revealsTargets.forEach(function(target) { hideElement(target); });
      hidesTargets.forEach(function(target) { showElement(target); });

      function updateVisibility() {
        var input = trigger.querySelector('input');
        var isChecked = input && input.checked;

        revealsTargets.forEach(function(target) {
          if (isChecked) {
            showElement(target);
          } else {
            hideElement(target);
          }
        });

        hidesTargets.forEach(function(target) {
          if (isChecked) {
            hideElement(target);
          } else {
            showElement(target);
          }
        });
      }

      if (isRadio && name) {
        document.querySelectorAll('usa-radio[name="' + name + '"]').forEach(function(radio) {
          if (!radio._conditionalListener) {
            radio._conditionalListener = true;
            radio.addEventListener('change', updateVisibility);
          }
        });
      } else if (isCheckbox) {
        trigger.addEventListener('change', updateVisibility);
      }

      updateVisibility();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initConditionalFields, 100); });
  } else {
    setTimeout(initConditionalFields, 100);
  }
}
</script>`;

/**
 * State visibility script for preview/export.
 * Hides elements whose data-states attribute doesn't include the active state.
 * Exposes window.setActiveState(id) for external control (e.g. state switcher UI).
 */
export const STATE_VISIBILITY_SCRIPT = `
<script>
if (!window._stateVisibilityInit) {
  window._stateVisibilityInit = true;

  function applyStateVisibility(activeStateId) {
    document.querySelectorAll('[data-states]').forEach(function(el) {
      var stateIds = el.getAttribute('data-states').split(',').map(function(s) { return s.trim(); });
      if (!activeStateId || stateIds.indexOf(activeStateId) !== -1) {
        el.style.display = '';
        el.removeAttribute('hidden');
      } else {
        el.style.display = 'none';
        el.setAttribute('hidden', '');
      }
    });
  }

  window.setActiveState = function(id) {
    applyStateVisibility(id || null);
  };

  // Apply initial state if set via data attribute on body
  var initialState = document.body.getAttribute('data-active-state');
  if (initialState) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { setTimeout(function() { applyStateVisibility(initialState); }, 100); });
    } else {
      setTimeout(function() { applyStateVisibility(initialState); }, 100);
    }
  }
}
</script>`;
