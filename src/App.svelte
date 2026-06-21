<script>
  import { onMount } from "svelte";
  import { covers } from "./lib/covers.js";
  import IconButton from "./lib/components/IconButton.svelte";
  import SearchField from "./lib/components/SearchField.svelte";
  import ViewControls from "./lib/components/ViewControls.svelte";

  let zoomShell;
  let titleBlock;
  let zoom = 1;
  let searchQuery = "";
  let showCenterButton = false;
  let isDockMinimized = true;

  const minZoom = 0.28;
  const maxZoom = 1.7;
  const zoomStep = 0.14;
  const imageSizes = "(max-width: 720px) 148px, (max-width: 1180px) 210px, 220px";
  const searchableCovers = covers.map((cover) => ({
    cover,
    searchText: normalizeSearchText([
      cover.title,
      cover.grade,
      cover.year,
      cover.subject,
      cover.collection,
      cover.imprint,
      cover.volume,
      cover.sourceName,
    ]),
  }));

  $: normalizedQuery = normalizeSearchText([searchQuery]);
  $: matchedCount = normalizedQuery
    ? searchableCovers.filter((item) => item.searchText.includes(normalizedQuery)).length
    : covers.length;
  $: searchResultLabel = normalizedQuery ? `${matchedCount}/${covers.length}` : `${covers.length} bìa`;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function viewportSize() {
    return {
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
    };
  }

  function syncVisualViewportVars() {
    const visualViewport = window.visualViewport;
    const viewport = viewportSize();
    document.documentElement.style.setProperty("--visual-viewport-w", `${viewport.width}px`);
    document.documentElement.style.setProperty("--visual-viewport-h", `${viewport.height}px`);
    document.documentElement.style.setProperty("--visual-viewport-left", `${visualViewport?.offsetLeft ?? 0}px`);
    document.documentElement.style.setProperty("--visual-viewport-top", `${visualViewport?.offsetTop ?? 0}px`);
  }

  function normalizeSearchText(values) {
    return values
      .filter(Boolean)
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  }

  function getBaseSize() {
    if (!zoomShell) {
      return { width: 0, height: 0 };
    }

    const width = zoomShell.dataset.baseWidth
      ? Number(zoomShell.dataset.baseWidth)
      : zoomShell.offsetWidth;
    const height = zoomShell.dataset.baseHeight
      ? Number(zoomShell.dataset.baseHeight)
      : zoomShell.offsetHeight;

    return { width, height };
  }

  function measureBaseSize() {
    if (!zoomShell) {
      return;
    }

    const inlineWidth = zoomShell.style.width;
    const inlineHeight = zoomShell.style.height;
    delete zoomShell.dataset.baseWidth;
    delete zoomShell.dataset.baseHeight;
    zoomShell.style.width = "";
    zoomShell.style.height = "";

    zoomShell.dataset.baseWidth = String(zoomShell.offsetWidth);
    zoomShell.dataset.baseHeight = String(zoomShell.offsetHeight);
    zoomShell.style.width = inlineWidth;
    zoomShell.style.height = inlineHeight;
  }

  function setZoom(nextZoom, anchorX, anchorY) {
    if (!zoomShell) {
      return;
    }

    const previousZoom = zoom;
    const next = clamp(nextZoom, minZoom, maxZoom);
    const viewport = viewportSize();
    const anchorLeft = anchorX ?? viewport.width / 2;
    const anchorTop = anchorY ?? viewport.height / 2;
    const worldX = (window.scrollX + anchorLeft) / previousZoom;
    const worldY = (window.scrollY + anchorTop) / previousZoom;
    const { width, height } = getBaseSize();

    zoom = next;
    zoomShell.style.width = `${width * next}px`;
    zoomShell.style.height = `${height * next}px`;
    document.documentElement.style.setProperty("--zoom", String(next));

    requestAnimationFrame(() => {
      window.scrollTo({
        left: worldX * next - anchorLeft,
        top: worldY * next - anchorTop,
        behavior: "instant",
      });
    });
  }

  function adjustZoom(delta) {
    setZoom(zoom + delta);
  }

  function resetZoom() {
    setZoom(1);
  }

  function centerTitle(behavior = "instant") {
    if (!titleBlock) {
      return;
    }

    const rect = titleBlock.getBoundingClientRect();
    const viewport = viewportSize();
    window.scrollTo({
      left: window.scrollX + rect.left + rect.width / 2 - viewport.width / 2,
      top: window.scrollY + rect.top + rect.height / 2 - viewport.height / 2,
      behavior,
    });
    requestAnimationFrame(updateCenterButton);
  }

  function updateCenterButton() {
    if (!titleBlock) {
      showCenterButton = false;
      return;
    }

    const rect = titleBlock.getBoundingClientRect();
    const titleX = rect.left + rect.width / 2;
    const titleY = rect.top + rect.height / 2;
    const viewport = viewportSize();
    const viewportX = viewport.width / 2;
    const viewportY = viewport.height / 2;
    const distance = Math.hypot(titleX - viewportX, titleY - viewportY);

    showCenterButton = distance > Math.min(360, viewport.width * 0.5);
  }

  function captionFor(cover) {
    const parts = [
      displayValue(cover.collection),
      displayValue(cover.imprint),
      displayValue(cover.year),
      displayVolume(cover.volume),
    ].filter(Boolean);

    return dedupe(parts).slice(0, 3).join(" · ");
  }

  function displayValue(value) {
    if (!value || value === "unknown") {
      return "";
    }

    return value
      .replace("2018 GDPT / 2020 Grade 1 curriculum", "GDPT 2018 / chương trình lớp 1")
      .replace("2018 GDPT / 2021 Grade 2 curriculum", "GDPT 2018 / chương trình lớp 2")
      .replace("2018 GDPT / 2021 Grade 6 curriculum", "GDPT 2018 / chương trình lớp 6")
      .replace("2018 GDPT / 2022 Grade 3 curriculum", "GDPT 2018 / chương trình lớp 3")
      .replace("2018 GDPT / 2022 Grade 7 curriculum", "GDPT 2018 / chương trình lớp 7")
      .replace("2018 GDPT / 2022 Grade 10 curriculum", "GDPT 2018 / chương trình lớp 10")
      .replace("2018 GDPT / 2023 Grade 4 curriculum", "GDPT 2018 / chương trình lớp 4")
      .replace("2018 GDPT / 2023 Grade 8 curriculum", "GDPT 2018 / chương trình lớp 8")
      .replace("2018 GDPT / 2023 Grade 11 curriculum", "GDPT 2018 / chương trình lớp 11")
      .replace("2018 GDPT / 2024 Grade 5 curriculum", "GDPT 2018 / chương trình lớp 5")
      .replace("2018 GDPT / 2024 Grade 9 curriculum", "GDPT 2018 / chương trình lớp 9")
      .replace("2018 GDPT / 2024 Grade 12 curriculum", "GDPT 2018 / chương trình lớp 12")
      .replace("pre-2020 common textbook / 2002 curriculum era", "sách phổ thông trước 2020 / chương trình 2002")
      .replace("pre-2020 common textbook / 2006 primary curriculum era", "sách tiểu học trước 2020 / chương trình 2006")
      .replace("pre-2020 common textbook / 2006 lower-secondary curriculum era", "sách THCS trước 2020 / chương trình 2006")
      .replace("pre-2020 common textbook / 2006 upper-secondary curriculum era", "sách THPT trước 2020 / chương trình 2006")
      .replace("pre-2020 common textbook / ", "sách phổ thông trước 2020 / ")
      .replace("pre-2020 advanced upper-secondary textbook", "sách nâng cao THPT trước 2020")
      .replace("pre-1981 reform / old Vietnamese primary textbook", "sách cũ trước cải cách 1981")
      .replace("post-1979 reform / pre-2002 common textbook", "sách phổ thông trước 2002")
      .replace("Cánh Diều / exact publisher not verified", "Cánh Diều / chưa xác minh NXB")
      .replace("2020-2021 school year", "năm học 2020-2021")
      .replace("2020-present", "từ 2020")
      .replace("2021-present", "từ 2021")
      .replace("2022-present", "từ 2022")
      .replace("curriculum era", "giai đoạn chương trình")
      .replace("school year", "năm học")
      .replace("lower-secondary", "THCS")
      .replace("upper-secondary", "THPT")
      .replace("primary", "tiểu học")
      .replace("textbook", "sách giáo khoa")
      .replace("curriculum", "chương trình");
  }

  function displayVolume(value) {
    const normalized = value?.toLowerCase();
    if (!value || normalized === "unknown" || normalized === "single volume") {
      return "";
    }
    return value.replace("Tập 1 / Tập 2 listed together", "Tập 1 / Tập 2");
  }

  function dedupe(values) {
    return [...new Set(values)];
  }

  function isPriorityCover(index) {
    return index >= 72 && index < 144;
  }

  onMount(() => {
    syncVisualViewportVars();
    measureBaseSize();
    setZoom(1);

    function queueInitialCenter() {
      centerTitle();
      requestAnimationFrame(updateCenterButton);
    }

    requestAnimationFrame(() => requestAnimationFrame(queueInitialCenter));
    const initialCenterTimeout = window.setTimeout(queueInitialCenter, 450);

    function onWheel(event) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setZoom(zoom * factor, event.clientX, event.clientY);
    }

    let resizeFrame = 0;
    let scrollFrame = 0;
    function queueViewportUpdate() {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        syncVisualViewportVars();
        updateCenterButton();
      });
    }

    function onResize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        syncVisualViewportVars();
        measureBaseSize();
        setZoom(zoom);
        requestAnimationFrame(updateCenterButton);
      });
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", queueViewportUpdate, { passive: true });
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", queueViewportUpdate, { passive: true });
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", queueViewportUpdate);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", queueViewportUpdate);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.clearTimeout(initialCenterTimeout);
      cancelAnimationFrame(resizeFrame);
      cancelAnimationFrame(scrollFrame);
    };
  });
</script>

<svelte:head>
  <title>Kho bìa sách giáo khoa Việt Nam</title>
</svelte:head>

<aside class:is-minimized={isDockMinimized} class="app-controls" aria-label="Công cụ xem kho bìa">
  {#if isDockMinimized}
    <button
      class="dock-toggle"
      type="button"
      aria-label="Hiện thanh công cụ"
      title="Hiện thanh công cụ"
      on:click={() => (isDockMinimized = false)}
    >
      Công cụ
    </button>
  {:else}
    <div class="dock-panel">
      <SearchField bind:value={searchQuery} resultLabel={searchResultLabel} />
      <div class="control-cluster">
        <ViewControls
          {zoom}
          {minZoom}
          {maxZoom}
          onZoomOut={() => adjustZoom(-zoomStep)}
          onZoomIn={() => adjustZoom(zoomStep)}
          onResetZoom={resetZoom}
        />
        <div class="dock-end-controls">
          <IconButton
            label="Về trung tâm"
            title="Về trung tâm"
            variant="compact"
            pressed={!showCenterButton}
            on:click={() => centerTitle("smooth")}
          >
            ⌖
          </IconButton>
          <button
            class="dock-toggle"
            type="button"
            aria-label="Ẩn thanh công cụ"
            title="Ẩn thanh công cụ"
            on:click={() => (isDockMinimized = true)}
          >
            Ẩn
          </button>
        </div>
      </div>
    </div>
  {/if}
</aside>

<div class="zoom-shell" bind:this={zoomShell}>
  <main class="canvas" aria-label="Khung tranh hữu hạn của bìa sách giáo khoa Việt Nam">
    <section class="cover-grid" aria-label="Lưới bìa sách giáo khoa">
      <section class="title-block" bind:this={titleBlock} aria-label="Tiêu đề">
        <h1>Kho bìa sách giáo khoa<br />Việt Nam</h1>
        <p class="subtitle">
          1980-2026 / kho tư liệu hình ảnh đang biên soạn / {covers.length} bìa sách
        </p>
        <p class="credit">
          bởi
          <a href="https://github.com/ThangHuuVu" target="_blank" rel="noreferrer">Vũ Hữu Thắng</a>
        </p>
      </section>

      {#each searchableCovers as item, index (item.cover.id)}
        {@const cover = item.cover}
        {@const isSearchMiss = normalizedQuery && !item.searchText.includes(normalizedQuery)}
        <a
          class="specimen"
          class:is-search-miss={isSearchMiss}
          href={cover.sourceUrl || undefined}
          target="_blank"
          rel="noreferrer"
          aria-label={`${cover.title}, lớp ${cover.grade}, ${cover.year}`}
          aria-hidden={isSearchMiss ? "true" : undefined}
          tabindex={isSearchMiss ? -1 : 0}
        >
          <figure>
            <img
              src={cover.thumbnailPath || cover.imagePath}
              srcset={cover.imageSrcset || undefined}
              sizes={cover.imageSrcset ? imageSizes : undefined}
              alt={`${cover.title}, lớp ${cover.grade}`}
              loading={isPriorityCover(index) ? "eager" : "lazy"}
              decoding="async"
              fetchpriority={isPriorityCover(index) ? "high" : "auto"}
            />
            <figcaption>
              <b>{cover.title}</b>
              <span>{captionFor(cover)}</span>
            </figcaption>
          </figure>
        </a>
      {/each}
    </section>

    <aside class="site-note" aria-label="Ghi chú">
      <p>
        Dự án phi thương mại, phục vụ lưu trữ hình ảnh và tham khảo thị giác. Bản quyền bìa sách, tên sách và nội dung liên quan thuộc về
        <br />
        các tác giả, nhà xuất bản và đơn vị giữ quyền tương ứng.
      </p>
      <p>
        Ý tưởng khung tranh cuộn hữu hạn được gợi cảm hứng từ
        <a href="https://www.ciggies.app/" target="_blank" rel="noreferrer">ciggies.app</a>.
        Mã nguồn mở miễn phí:
        <a href="https://github.com/ThangHuuVu/sgk" target="_blank" rel="noreferrer">GitHub</a>
      </p>
    </aside>
  </main>
</div>
