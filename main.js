// imports
import * as THREE from 'three'
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/FBXLoader.js'
// import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js'

// Follow Controls
class FollowControls {
    constructor(camera, domElement) {
        this.camera = camera
        this.domElement = domElement
        this.azimuth = 0
        this.polar = 1.2
        this.minpolar = 0.6
        this.maxpolar = 2.1
        this.sensi = 0.003565454546
        this.arrasto = false

        domElement.addEventListener('mousedown', () => this.arrasto = true)
        domElement.addEventListener('mouseup', () => this.arrasto = false)
        domElement.addEventListener('mouseleave', () => this.arrasto = false)
        domElement.addEventListener('mousemove', (e) => {
            if (!this.arrasto) return
            this.azimuth -= e.movementX * this.sensi
            this.polar -= e.movementY * this.sensi
            this.polar = Math.max(this.minpolar, Math.min(this.maxpolar, this.polar))
        })
    }
    getAzimuthalAngle() {
        return this.azimuth
    }
    getPolarAngle() {
        return this.polar
    }
}

// scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x00F8FF)
scene.fog = new THREE.Fog(0x00F8FF, 10, 50)

// camera
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 7, -16)
scene.add(camera)

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

// controls
const controls = new FollowControls(camera, renderer.domElement)

// lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(10, 20, 10)
directionalLight.castShadow = true
scene.add(directionalLight)

// ground
const groundLoader = new THREE.TextureLoader()
const groundTexture = groundLoader.load('textures/chato.jpg')
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping
groundTexture.repeat.set(10, 10)
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 200),
    new THREE.MeshStandardMaterial({ map: groundTexture }))
ground.rotation.x = -Math.PI / 2
scene.add(ground)

// walls
const wallLoader = new THREE.TextureLoader()
const wallTexture = wallLoader.load('textures/LaFerrari.jpg')
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping
wallTexture.repeat.set(1, 1)
const wall1 = new THREE.Mesh(
    new THREE.BoxGeometry(1, 20, 100),
    new THREE.MeshStandardMaterial({ map: wallTexture }))
wall1.position.set(-12, 10, 0)
scene.add(wall1)
const wall2 = new THREE.Mesh(
    new THREE.BoxGeometry(1, 20, 100),
    new THREE.MeshStandardMaterial({ map: wallTexture }))
wall2.position.set(12, 10, 0)
scene.add(wall2)

let jogador 
let mixer
const clock = new THREE.Clock()
const fbxLoader = new FBXLoader()
const actions = {
    idle: null,
    walk: null,
    run: null
}
let activeaction = null 
let runornot = false
const velocityrun = 0.25
const velocitywalk = 0.05
const cameraoffset = new THREE.Vector3(0, 5, -8)
const cameraSmoothness = 0.8

fbxLoader.load('models/Idle.fbx', (fbx) => {
    jogador = fbx
    jogador.scale.setScalar(0.03)
    scene.add(jogador)

    mixer = new THREE.AnimationMixer(jogador)
    if (fbx.animations && fbx.animations.length > 0) {
        actions.idle = mixer.clipAction(fbx.animations[0])
        actions.idle.play()
        activeaction = actions.idle
    }
    fbxLoader.load('models/Walking.fbx', (fbx) => {
        if (fbx.animations && fbx.animations.length > 0) {
            actions.walk = mixer.clipAction(fbx.animations[0])
        }})
    fbxLoader.load('models/running.fbx', (fbx) => {
        if (fbx.animations && fbx.animations.length > 0) {
            actions.run = mixer.clipAction(fbx.animations[0])
        }})
}, console.error)

function fadetoAction(newAction, duration = 0.35) {
    if (!mixer) return
    const nextaction = actions[newAction]
    if (!newAction || nextaction === activeaction) return
    nextaction.reset()
    nextaction.play()
    if (activeaction) {
        activeaction.crossFadeTo(nextaction, duration, false)
    }
    activeaction = nextaction
} 

const keys = {}
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true
    if(e.key === "Shift") keys['shift'] = true
})
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false
    if(e.key === "Shift") keys['shift'] = false
})

function animate() {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (mixer) mixer.update(delta)
    const moving = keys['w'] || keys['a'] || keys['s'] || keys['d']
    runornot = !!keys['shift']
    if (moving) {
        if (runornot) {
            fadetoAction('run')
        } else {
            fadetoAction('walk')
        }
    } else {
        fadetoAction('idle')
    }
    if (jogador) {
        const movespeed = runornot ? velocityrun : velocitywalk
        const direction = new THREE.Vector3()
        const foward = new THREE.Vector3()
        const right = new THREE.Vector3()
        camera.getWorldDirection(foward)
        foward.y = 0
        foward.normalize()
        right.copy(foward).cross(new THREE.Vector3(0, 1, 0)).normalize()
        if (keys['w']) direction.add(foward)
        if (keys['s']) direction.sub(foward)
        if (keys['a']) direction.sub(right)
        if (keys['d']) direction.add(right)
        if (direction.length() > 0){
            direction.normalize()
            jogador.position.addScaledVector(direction, movespeed)
            const targetQuaternion = new THREE.Quaternion()
            // Corrigido: setFromUnitVectors (maiúsculo!)
            targetQuaternion.setFromUnitVectors(
                new THREE.Vector3(0, 0, 1), direction.clone().normalize())
            jogador.quaternion.slerp(targetQuaternion, 0.18)
        }
        const Cupdt = jogador.position.clone().add(cameraoffset.clone().applyAxisAngle(
            new THREE.Vector3(0, 1, 0), controls.getAzimuthalAngle()))
        camera.position.lerp(Cupdt, cameraSmoothness)
        const Clookat = jogador.position.clone().add(new THREE.Vector3(0, 3, 0))
        camera.lookAt(Clookat)
    }
    renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})
