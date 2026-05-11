import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface CreateThreeViewportOptions {
  cameraPosition: [number, number, number]
  container: HTMLElement
  target: [number, number, number]
}

export interface ThreeViewport {
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  dispose: () => void
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  start: (
    onFrame: (deltaSeconds: number) => void,
    onAfterRender?: () => void,
  ) => void
}

export function createThreeViewport({
  cameraPosition,
  container,
  target,
}: CreateThreeViewportOptions): ThreeViewport {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearAlpha(0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(...cameraPosition)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.target.set(...target)
  controls.update()

  container.appendChild(renderer.domElement)

  let animationFrame = 0
  let disposed = false

  const resize = () => {
    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  const resizeObserver = new ResizeObserver(() => {
    resize()
  })
  resizeObserver.observe(container)
  resize()

  return {
    camera,
    controls,
    dispose: () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
    renderer,
    scene,
    start: (onFrame, onAfterRender) => {
      const clock = new THREE.Clock()

      const renderFrame = () => {
        if (disposed) {
          return
        }

        const deltaSeconds = clock.getDelta()
        onFrame(deltaSeconds)
        controls.update()
        renderer.render(scene, camera)
        onAfterRender?.()
        animationFrame = window.requestAnimationFrame(renderFrame)
      }

      renderFrame()
    },
  }
}
