<script>
  import { onMount } from "svelte";
  import { covers } from "./lib/covers.js";

  let zoomShell;
  let titleBlock;
  let zoom = 1;

  const minZoom = 0.28;
  const maxZoom = 1.7;
  const imageSizes = "(max-width: 720px) 148px, (max-width: 1180px) 210px, 220px";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

  function setZoom(nextZoom, anchorX = window.innerWidth / 2, anchorY = window.innerHeight / 2) {
    if (!zoomShell) {
      return;
    }

    const previousZoom = zoom;
    const next = clamp(nextZoom, minZoom, maxZoom);
    const worldX = (window.scrollX + anchorX) / previousZoom;
    const worldY = (window.scrollY + anchorY) / previousZoom;
    const { width, height } = getBaseSize();

    zoom = next;
    zoomShell.style.width = `${width * next}px`;
    zoomShell.style.height = `${height * next}px`;
    document.documentElement.style.setProperty("--zoom", String(next));

    requestAnimationFrame(() => {
      window.scrollTo({
        left: worldX * next - anchorX,
        top: worldY * next - anchorY,
        behavior: "instant",
      });
    });
  }

  function centerTitle() {
    if (!titleBlock) {
      return;
    }

    const rect = titleBlock.getBoundingClientRect();
    window.scrollTo({
      left: window.scrollX + rect.left + rect.width / 2 - window.innerWidth / 2,
      top: window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2,
      behavior: "instant",
    });
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
    measureBaseSize();
    setZoom(1);
    requestAnimationFrame(() => requestAnimationFrame(centerTitle));

    function onWheel(event) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setZoom(zoom * factor, event.clientX, event.clientY);
    }

    let resizeFrame = 0;
    function onResize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        measureBaseSize();
        setZoom(zoom);
        requestAnimationFrame(centerTitle);
      });
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(resizeFrame);
    };
  });
</script>

<svelte:head>
  <title>Kho bìa sách giáo khoa Việt Nam</title>
</svelte:head>

<div class="zoom-shell" bind:this={zoomShell}>
  <main class="canvas" aria-label="Khung tranh hữu hạn của bìa sách giáo khoa Việt Nam">
    <section class="cover-grid" aria-label="Lưới bìa sách giáo khoa">
      <section class="title-block" bind:this={titleBlock} aria-label="Tiêu đề">
        <h1>Kho bìa sách giáo khoa<br />Việt Nam</h1>
        <p class="subtitle">1980-2026 / kho tư liệu hình ảnh đang biên soạn</p>
        <p class="meta">{covers.length} bìa sách</p>
      </section>

      {#each covers as cover, index (cover.id)}
        <a
          class="specimen"
          href={cover.sourceUrl || undefined}
          target="_blank"
          rel="noreferrer"
          aria-label={`${cover.title}, lớp ${cover.grade}, ${cover.year}`}
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
  </main>
</div>
