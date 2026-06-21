<script>
  export let value = "";
  export let resultLabel = "";
</script>

<label class="search-control">
  <span class="control-icon" aria-hidden="true">⌕</span>
  <input
    bind:value
    type="text"
    role="searchbox"
    autocomplete="off"
    spellcheck="false"
    placeholder="Tìm tên sách, lớp, năm, nhà xuất bản"
    aria-label="Tìm bìa sách"
  />
  {#if value}
    <button
      class="inline-clear"
      type="button"
      aria-label="Xóa tìm kiếm"
      title="Xóa tìm kiếm"
      on:click={() => (value = "")}
    >
      ×
    </button>
  {/if}
  <span class="search-result" aria-live="polite">{resultLabel}</span>
</label>
