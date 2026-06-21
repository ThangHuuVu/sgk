<script>
  export let value = "";
  export let resultLabel = "";
  export let describedBy = undefined;
  export let onSubmit = () => {};
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
    aria-describedby={describedBy}
    on:keydown={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      }
    }}
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
