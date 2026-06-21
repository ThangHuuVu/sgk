<script>
  export let label;
  export let title = label;
  export let disabled = false;
  export let pressed = false;
  export let variant = "default";
</script>

<button
  class="control-button"
  class:is-pressed={pressed}
  class:is-compact={variant === "compact"}
  type="button"
  {disabled}
  aria-label={label}
  {title}
  on:click
>
  <span aria-hidden="true"><slot /></span>
</button>
