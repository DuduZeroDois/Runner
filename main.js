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
const groundsegment = []
const groundlenght = 200
const groundcount = 4
for (let i = 0; i < groundcount; i++) {
    const segment = ground.clone()
    segment.position.z = i * groundlenght
    groundsegment.push(segment)
    scene.add(segment)
}
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
const wallsegment = []
const walllenght = 100
const wallcount = 4
let pethcenterx = 0
const curve = 1.4
function CreateSW(z) {
    const CL = wall1.clone()
    const CR = wall2.clone()
    CL.position.z = z
    CR.position.z = z
    pethcenterx += THREE.MathUtils.randFloat(-curve, curve)
    pethcenterx = THREE.MathUtils.clamp(pethcenterx, -8, 8)
    const offset = pethcenterx
    CL.position.x = -10 + offset
    CR.position.x = 10 + offset
    scene.add(CL)
    scene.add(CR)
    wallsegment.push({
        CL,CR,boxs: [
            new THREE.Box3().setFromObject(CL),
            new THREE.Box3().setFromObject(CR)
        ]
    })
}
for (let i = 0; i < groundcount; i++) {
    CreateSW(i * walllenght)
}
// Text Sprite
function createTextSprite(message) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 512
    canvas.height = 256
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)'
    ctx.font = '28px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(message, 10 , 10)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true})
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(25, 2.5, 1)
    return sprite
}

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
    if (!nextaction || nextaction === activeaction) return
    nextaction.reset()
    nextaction.play()
    if (activeaction) {
        activeaction.crossFadeTo(nextaction, duration, false)
    }
    activeaction = nextaction
} 
//Stone
//config stone
const StoneGEO = new THREE.SphereGeometry(4, 80, 80)
const StoneMAT = new THREE.MeshStandardMaterial({ color: 0x888888 })
const stone = new THREE.Mesh(StoneGEO, StoneMAT)
const startz = -20
stone.position.set(0, 2, startz)
stone.castShadow = true
scene.add(stone)
let stoneSpeed = 0.13
let controlMoveStone = true
let delayStone = 6500
let IsReturningStone = false    
//safezone
const ZoneGEO = new THREE.BoxGeometry(20, 10, 10)
const ZoneMAT = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 })
const safezone = new THREE.Mesh(ZoneGEO, ZoneMAT)
safezone.position.set(0, 2.5, 35)
scene.add(safezone)

// stone movement
function moveStone(delta) {
    if (! controlMoveStone) return
    stone.position.z += stoneSpeed
    stone.rotation.x += stoneSpeed * 0.2
    const stoneBox = new THREE.Box3().setFromObject(stone)
    const zoneBox = new THREE.Box3().setFromObject(safezone)
    if (! IsReturningStone && stoneBox.intersectsBox(zoneBox)) {
        IsReturningStone = true
        stoneSpeed =- Math.abs(stoneSpeed)
    }
    if (IsReturningStone && stone.position.z < startz) {
        stone.position.x = THREE.MathUtils.randFloatSpread(12)
        stone.position.z = startz
        stoneSpeed = Math.abs(stoneSpeed)
        delayStone = 6500
        IsReturningStone = false
}}

//colsion detection
let PlayerBox = new THREE.Box3()
let StoneBox = new THREE.Box3()
let Touching = false
let Lifes = false
let LifesN = 5
const lifesDisplay = createTextSprite('Lifes: 5')
scene.add(lifesDisplay)
lifesDisplay.position.set(0, 1.2, -2)
const NameDisplay = createTextSprite('My name is Michael')
scene.add(NameDisplay)
lifesDisplay.position.set(20, 1.2, -2)
function Colli() {
    if (Touching || Lifes) return
    Touching = true
    Lifes = true
    LifesN -= 1
    setTimeout(() => {
        Lifes = false
    }, 2300)
    if (LifesN <= 0) {
        alert("Game Over! You lost all your lives.")
        setTimeout(() => {
            window.location.reload()
        }, 100)
    }
    stoneSpeed = 0
    const hitDirection = new THREE.Vector3(0, 0, 1)
    hitDirection.applyQuaternion(jogador.quaternion)
    hitDirection.normalize()
    const Launch = hitDirection.multiplyScalar(1)
    let DurationLanch = 0
    const Interval = setInterval(() => {
        DurationLanch += 0.023
        jogador.position.add(Launch)
        jogador.rotation.x += 0.1
        if (DurationLanch >= 1) {
            clearInterval(Interval)
            Touching = false
            stoneSpeed = 0.13
        }}, 16)}

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
            wallsegment.forEach(segment =>{
                if (jogador.position.z - segment.CL.position.z > walllenght){
                    segment.CL.position.z += walllenght * wallsegment.length
                    segment.CR.position.z += walllenght * wallsegment.length
                    pethcenterx += THREE.MathUtils.randFloat(-curve, curve)
                    pethcenterx = THREE.MathUtils.clamp(pethcenterx, -8, 8)
                    const offset = pethcenterx
                    segment.CL.position.x = -10 + offset
                    segment.CR.position.x = 10 + offset
                    segment.boxs[0].setFromObject(segment.CL)
                    segment.boxs[1].setFromObject(segment.CR)
                }
            })
            groundsegment.forEach(segment => {
                if (jogador.position.z - segment.position.z > groundlenght){
                    segment.position.z += groundlenght * groundsegment.length
                }
            })
            //jogador.position.addScaledVector(direction, movespeed)
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
    moveStone(delta)
    if (jogador) {
        PlayerBox.setFromObject(jogador)
        StoneBox.setFromObject(stone)
        if (PlayerBox.intersectsBox(StoneBox)) Colli()
        }
    renderer.render(scene, camera)
}
animate()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

//vc ta conversando comigo?
//voce e eu estamos conversando?
//sim estamos conversando
//entao me diga, qual a cor do ceu em um dia claro?
//o ceu e azul em um dia claro
//eai tudo bem?
//tudo bem e com voce?