<script>
  import IconButton from "./IconButton.svelte";

  export let zoom = 1;
  export let minZoom = 0.28;
  export let maxZoom = 1.7;
  export let onZoomOut = () => {};
  export let onZoomIn = () => {};
  export let onResetZoom = () => {};
</script>

<div class="view-controls" aria-label="Điều khiển khung nhìn">
  <IconButton
    label="Thu nhỏ"
    title="Thu nhỏ"
    disabled={zoom <= minZoom}
    on:click={onZoomOut}
  >
    −
  </IconButton>
  <button
    class="zoom-readout"
    type="button"
    aria-label="Đặt lại mức phóng đại"
    title="Đặt lại mức phóng đại"
    on:click={onResetZoom}
  >
    {Math.round(zoom * 100)}%
  </button>
  <IconButton
    label="Phóng to"
    title="Phóng to"
    disabled={zoom >= maxZoom}
    on:click={onZoomIn}
  >
    +
  </IconButton>
</div>
