/**
 * Pause animations, for video. CSS stops animations and transitions but not
 * a playing video, so turning the tool on pauses what is playing or set to
 * autoplay, once. While it is on, videos the page adds later (a route change,
 * a feed) are kept from autoplaying. A video the visitor then starts is left
 * playing: it is never paused again on an unrelated settings change (#11).
 */

let observer: MutationObserver | null = null

function stop(video: HTMLVideoElement): void {
  video.autoplay = false
  video.pause()
}

export function enable(): void {
  if (observer) return
  for (const video of Array.from(document.querySelectorAll('video'))) {
    if (video.autoplay || !video.paused) stop(video)
  }
  observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (!(node instanceof Element)) continue
        const videos = node instanceof HTMLVideoElement ? [node] : Array.from(node.querySelectorAll('video'))
        for (const video of videos) if (video.autoplay) stop(video)
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

export function teardown(): void {
  observer?.disconnect()
  observer = null
}
