import * as THREE from 'three'

interface HelloCubeState {
  rotationSpeed: number
  showAxes: boolean
}

export interface HelloCubeController {
  dispose: () => void
  setAxesVisible: (showAxes: boolean) => void
  setRotationSpeed: (rotationSpeed: number) => void
}

export function createHelloCube(
  container: HTMLElement,
  initialState: HelloCubeState,
): HelloCubeController {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearAlpha(0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(2.8, 2.4, 3.6)
  camera.lookAt(0, 0, 0)

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.6)
  const directionalLight = new THREE.DirectionalLight(0x7dd3fc, 2.6)
  directionalLight.position.set(3, 4, 2)
  scene.add(ambientLight, directionalLight)

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.15,
      roughness: 0.3,
    }),
  )
  cube.rotation.x = 0.55
  cube.rotation.y = 0.35
  scene.add(cube)

  const axesHelper = new THREE.AxesHelper(1.7)
  axesHelper.visible = initialState.showAxes
  scene.add(axesHelper)

  container.appendChild(renderer.domElement)

  let disposed = false
  let animationFrame = 0
  let rotationSpeed = initialState.rotationSpeed

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

  const renderFrame = () => {
    if (disposed) {
      return
    }

    cube.rotation.y += rotationSpeed
    cube.rotation.x += rotationSpeed * 0.5
    renderer.render(scene, camera)
    animationFrame = window.requestAnimationFrame(renderFrame)
  }

  renderFrame()

  return {
    dispose: () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      scene.remove(cube, axesHelper, ambientLight, directionalLight)
      cube.geometry.dispose()
      cube.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
    setAxesVisible: (showAxes) => {
      axesHelper.visible = showAxes
    },
    setRotationSpeed: (nextRotationSpeed) => {
      rotationSpeed = nextRotationSpeed
    },
  }
}
