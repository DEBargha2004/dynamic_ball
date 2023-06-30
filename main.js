import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as physics from 'cannon-es'

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true

const world = new physics.World({
  gravity: new physics.Vec3(0, -9.82, 0)
})
const timeStep = 1 / 60

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
)
camera.position.set(0, 15, 25)
const orbit = new OrbitControls(camera, renderer.domElement)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(10, 10, 10)
scene.add(directionalLight)
directionalLight.castShadow = true

directionalLight.shadow.camera.top = 25
directionalLight.shadow.camera.bottom = -25
directionalLight.shadow.camera.left = -25
directionalLight.shadow.camera.right = 25

directionalLight.shadow.mapSize.height = 2048
directionalLight.shadow.mapSize.width = 2048

// const directionalLightHelper = new THREE.CameraHelper(
//   directionalLight.shadow.camera
// )
// scene.add(directionalLightHelper)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

const planeGeo = new THREE.PlaneGeometry(30, 30, 100, 100)
const planeMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  wireframe: false,
  side: THREE.DoubleSide
})
const planeMesh = new THREE.Mesh(planeGeo, planeMat)
// planeMesh.rotateX(-Math.PI / 2)
planeMesh.receiveShadow = true
scene.add(planeMesh)
const planePhysicsMat = new physics.Material()
const planePhysics = new physics.Body({
  shape: new physics.Box(new physics.Vec3(15, 15, 0.1)),
  type: physics.Body.STATIC,
  material: planePhysicsMat
})

planePhysics.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(planePhysics)

const mousePosition = new THREE.Vector2()
const planeNormal = new THREE.Vector3()
const objectPosition = new THREE.Vector3()
const Raycaster = new THREE.Raycaster()
const plane = new THREE.Plane()

window.addEventListener('mousemove', e => {
  mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1
  mousePosition.y = 1 - 2 * (e.clientY / window.innerHeight)

  Raycaster.setFromCamera(mousePosition, camera)
  planeNormal.copy(camera.position).normalize()
  plane.setFromNormalAndCoplanarPoint(planeNormal, scene.position)
  Raycaster.ray.intersectPlane(plane, objectPosition)
})

// scene.position.set(10,0,0)

let balls = []
function createNewBall () {
  const radius = 3 * Math.random()
  const density = 1.45
  // structure creation started
  const sphereGeo = new THREE.SphereGeometry(radius)
  const sphereMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(Math.random(), Math.random(), Math.random()),
    wireframe: false
  })
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
  scene.add(sphereMesh)
  sphereMesh.receiveShadow = true
  sphereMesh.castShadow = true
  sphereMesh.position.copy(objectPosition)
  //structure creation ended

  const spherePhysicsMat = new physics.Material()
  const spherePhysics = new physics.Body({
    shape: new physics.Sphere(radius),
    mass: (4 / 3) * Math.PI * radius ** 3 * density,
    material: spherePhysicsMat
  })
  spherePhysics.position.copy(objectPosition)
  spherePhysics.linearDamping = 0.5
  world.addBody(spherePhysics)
  let newBall = {
    structure: sphereMesh,
    behaviour: spherePhysics
  }
  balls = [...balls, newBall]
}

window.addEventListener('click', () => {
  createNewBall()
})

function animate () {
  renderer.render(scene, camera)

  world.step(timeStep)

  planeMesh.position.copy(planePhysics.position)
  planeMesh.quaternion.copy(planePhysics.quaternion)

  // sphereMesh?.position.copy(spherePhysics.position)
  // sphereMesh?.quanterion.copy(spherePhysics.quaternion)
  balls.map(ball => {
    const { structure, behaviour } = ball

    structure.position.copy(behaviour.position)
    structure.quaternion.copy(behaviour.quaternion)

    const planeSpherePhysicsMat = new physics.ContactMaterial(
      planePhysicsMat,
      behaviour.material,
      {
        restitution: 0.9,
        friction: 0.3
      }
    )
    world.addContactMaterial(planeSpherePhysicsMat)
  })
}
renderer.setAnimationLoop(animate)

window.addEventListener('resize', e => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

document.getElementById('app').appendChild(renderer.domElement)
