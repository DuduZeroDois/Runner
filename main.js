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
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 7, -16)
//scene.add(camera)

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
    new THREE.MeshStandardMaterial({ map: groundTexture })
)
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

// Lava
const lavaTexture = new THREE.TextureLoader().load('textures/lava.jpg')
lavaTexture.wrapS = lavaTexture.wrapT = THREE.RepeatWrapping
lavaTexture.repeat.set(1, 1)
const lava = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 200),
    new THREE.MeshStandardMaterial({ map: lavaTexture })
)
lava.rotation.x = -Math.PI / 2
lava.position.set (0, 0.05, -150)
scene.add(lava)
let lavaBox = new THREE.Box3().setFromObject(lava)
let SpeedL = 0.05

// walls
const wallLoader = new THREE.TextureLoader()
const wallTexture = wallLoader.load('textures/LaFerrari.jpg')
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping
wallTexture.repeat.set(1, 1)
const wall1 = new THREE.Mesh(
    new THREE.BoxGeometry(1, 20, 100),
    new THREE.MeshStandardMaterial({ map: wallTexture }))
wall1.position.set(-12, 10, 0)
const wall2 = wall1.clone()
wall2.position.x = 12
scene.add(wall1, wall2)

const wallsegment = []
const walllenght = 100
let pethcenterx = 0
const curve = 1.4

function CreateSW(zoffset) {
    const CL = wall1.clone()
    const CR = wall2.clone()
    CL.position.z = zoffset
    CR.position.z = zoffset
    pethcenterx += THREE.MathUtils.randFloat(-curve, curve)
    pethcenterx = THREE.MathUtils.clamp(pethcenterx, -8, 8)
    const offset = pethcenterx
    CL.position.x = -20 + offset // para aumentar = alterar aqui
    CR.position.x = 20 + offset
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

function WUPDT() {
  if (!jogador) return;

  wallsegment.forEach(segment => {

    if (jogador.position.z - segment.CL.position.z > walllenght) {

      const newZ = segment.CL.position.z + walllenght * wallsegment.length;

      // curva procedural igual à criação inicial
      pethcenterx += THREE.MathUtils.randFloat(-curve, curve);
      pethcenterx = THREE.MathUtils.clamp(pethcenterx, -8, 8);

      const offset = pethcenterx;

      segment.CL.position.set(-20 + offset, 2.5, newZ);
      segment.CR.position.set(20 + offset, 2.5, newZ);

      // atualiza colisores
      segment.boxs[0].setFromObject(segment.CL);
      segment.boxs[1].setFromObject(segment.CR);
    }

  });
}

// OBSTÁCULOS PROCEDURAIS ( Clindro )
const textureLoader = new THREE.TextureLoader()
const obstacleTexture = textureLoader.load('textures/obstacle.jpg');
const obstacleMaterial = new THREE.MeshStandardMaterial({
  map: obstacleTexture
});
const obstacleGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);

const obstacles = [];
const obstacleCount = 10;
const obstacleSpacing = 20;

function createObstacle(zPos) {
  const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle.castShadow = true;

  // posição procedural controlada
  obstacle.position.set(
    THREE.MathUtils.randFloat(-3, 3), // respeita as paredes
    1,
    zPos
  );

  scene.add(obstacle);

  obstacles.push({
    mesh: obstacle,
    box: new THREE.Box3().setFromObject(obstacle)
  });
}
for (let i = 1; i <= obstacleCount; i++) {
  createObstacle(i * obstacleSpacing + 10);
}

// Criação de HUD 
let LifesN = 5
const HUD = document.createElement('div')
HUD.style.position = 'fixed'
HUD.style.top = '20px'
HUD.style.left = '20px'
HUD.style.color = 'white'
HUD.style.fontSize = '24px'
HUD.style.fontFamily = 'Arial, sans-serif'
HUD.style.zIndex = '1000'
document.body.appendChild(HUD)

// -- ADD -- SCORE SYSTEM
let Score = 0
let Multi = 1
let FarScore = 5

const GameState = {
    RUNNING: 'running',
    GAMEOVER: 'gameover',
    HIT: 'hit'
}
let currentState = GameState.RUNNING

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
    if (fbx.animations.length > 0) {
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
}, undefined, (error) => { console.error(error) })


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

const StoneGEO = new THREE.SphereGeometry(4, 80, 80)
const StoneMAT = new THREE.MeshStandardMaterial({ color: 0x888888 })
const stone = new THREE.Mesh(StoneGEO, StoneMAT)
const startz = -100
stone.position.set(0, 2, startz)
stone.castShadow = true
scene.add(stone)

let stoneSpeed = 0.13
let controlMoveStone = true
let stoneDelay = 6500
let IsReturningStone = false    

//safezone
const ZoneGEO = new THREE.BoxGeometry(20, 10, 10)
const ZoneMAT = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 })
const stones = []

function createOtherStone(zoffset) {
    const pedra = stone.clone()
    pedra.position.set(THREE.MathUtils.randFloatSpread(6), 2, startz -zoffset)
    scene.add(pedra)

    const zone = new THREE.Mesh(ZoneGEO, ZoneMAT)
    zone.position.set(0, 2.5, 150 - zoffset) 
    scene.add(zone)

    stones.push({
        mesh: pedra,
        safezone: zone,
        speed: stoneSpeed,
        delayStone: stoneDelay,
        IsReturningStone: false
    })}
for (let i = 0; i < 3; i++) {
    createOtherStone(i * 20)
}

// ADD DIFFICULTY CONTROLLER
let time = 0
let DificultyMultiplier = 1
function updateDifficulty(delta) {
    if (currentState !== GameState.RUNNING) return
    time += delta
    DificultyMultiplier = 1 + time * 0.06 // aumenta a dificuldade ao longo do tempo
    stones.forEach(stoneData => {
        stoneData.speed = Math.sign(stoneData.speed) * stoneSpeed * DificultyMultiplier
    })
}

const safezone = new THREE.Mesh(ZoneGEO, ZoneMAT)
safezone.position.set(0, 2.5, 150)
scene.add(safezone)

// Colisão
let PlayerBox = new THREE.Box3()
let StoneBox = new THREE.Box3()
let Touching = false
let Lifes = false

function colisaoparedes() {
    const xmim = -20 + pethcenterx + 1
    const xmax = 20 + pethcenterx - 1
    jogador.position.x = THREE.MathUtils.clamp(jogador.position.x, xmim, xmax)
}

function Colli() {
    // if (Touching || Lifes) return
    if (currentState === GameState.HIT || currentState === GameState.GAMEOVER) return
    currentState = GameState.HIT
    Touching = true
    Lifes = true
    LifesN -= 1
    // atualizar texto na tela
    setTimeout(() => {
        Lifes = false
    }, 2300)
    if (LifesN <= 0) {
        alert("Game Over! You lost all your lives.")
        currentState = GameState.GAMEOVER
        setTimeout(() => {
            window.location.reload()
        }, 2555)
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
        colisaoparedes()
        jogador.rotation.x += 0.1
        jogador.rotation.x = THREE.MathUtils.clamp(jogador.rotation.x, -1.2, 1.2)
        if (DurationLanch >= 1) {
            clearInterval(Interval)
            Touching = false
            stoneSpeed = 0.13
            jogador.rotation.set(0, jogador.rotation.y, 0)
            if (currentState !== GameState.GAMEOVER) currentState = GameState.RUNNING
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

// stone movement
function MVSTOUPDT(delta) {
    if (currentState !== GameState.RUNNING) return
    if (!controlMoveStone) return
    stone.position.z += stoneSpeed
    stone.rotation.x += stoneSpeed * 0.2
    const stoneBox = new THREE.Box3().setFromObject(stone)
    const zoneBox = new THREE.Box3().setFromObject(safezone)
    if (!IsReturningStone && stoneBox.intersectsBox(zoneBox)) {
        IsReturningStone = true
        stoneSpeed = -Math.abs(stoneSpeed)
    }
    if (IsReturningStone && stone.position.z <= startz) {
        stone.position.x = THREE.MathUtils.randFloatSpread(12)
        stone.position.z = startz
        stoneSpeed = Math.abs(stoneSpeed)
        IsReturningStone = false
        stoneDelay = 6500
}}

function OTHSTOUPDT(delta) {
    if (currentState !== GameState.RUNNING) return
    stones.forEach(stoneData => {
        const pedra = stoneData.mesh
        if (stoneData.delayStone > 0) {
            stoneData.delayStone -= delta * 1000
            return
        }
        pedra.position.z += stoneData.speed
        pedra.rotation.x += stoneData.speed * 0.25
        const StoneBox2 = new THREE.Box3().setFromObject(pedra)
        const zoneBox2 = new THREE.Box3().setFromObject(stoneData.safezone) // tirei stonedata porque o safezone é global e não precisa de delay para cada pedra, só para a primeira pedra
        if (!stoneData.IsReturningStone && StoneBox2.intersectsBox(zoneBox2)) {
            stoneData.IsReturningStone = true
            stoneData.speed = -Math.abs(stoneData.speed)
        }
        if (stoneData.IsReturningStone && pedra.position.z <= startz) {
            pedra.position.x = THREE.MathUtils.randFloatSpread(12)
            pedra.position.z = startz
            stoneData.speed = Math.abs(stoneData.speed)
            stoneData.delayStone = 6500
            stoneData.IsReturningStone = false
        }
        if (jogador) {
            PlayerBox.setFromObject(jogador)
            if (PlayerBox.intersectsBox(StoneBox2)) {
                Colli()
            }
        }
})}

// --- Itens Count/Total --- //
const Colectables = []
const TotalItens = 67

function  CIC(z) {
    const itemGEO = new THREE.TorusGeometry(1, 0.4, 16, 32)
    const ItemMesh = new THREE.MeshStandardMaterial({ color: 0xf2ff00, emissive: 0xffaa00, emissiveIntensity: 1 })
    const item = new THREE.Mesh(itemGEO, ItemMesh)
    item.position.set(THREE.MathUtils.randFloat(-5, 5), 2, z)
    scene.add(item)
    Colectables.push({
        mesh: item,
        box: new THREE.Box3().setFromObject(item),
        collected: false
    })
}
for (let i = 1; i < TotalItens; i++) {
    CIC(i * 30)
}
let ItensCount = 0

// --- ADD HUD UPDATE FUNCTION --- //
function updateHUD() {
    HUD.innerHTML = `
        Lifes: ${LifesN} <br>
        Score: ${Math.floor(Score)} <br>
        Itens: ${ItensCount}/${TotalItens} <br>
        Multiplier: x${Multi.toFixed(1)}
    `
}

// --- ADD Itens Count Update Function --- //
function ITCUPDT() {
    if (!jogador) return
    PlayerBox.setFromObject(jogador)
    Colectables.forEach(itemData => {
        if (itemData.collected) return
        if (jogador.position.z - itemData.mesh.position.z > 10) {
            itemData.mesh.position.z += 200
            itemData.mesh.position.x = THREE.MathUtils.randFloat(-5, 5)
        }
        itemData.box.setFromObject(itemData.mesh)
        itemData.mesh.rotation.y += 0.05
        itemData.mesh.position.y = 2 + Math.sin(performance.now() * 0.005) * 0.5
        const ColliDist = jogador.position.distanceTo(itemData.mesh.position)
        if (ColliDist < 2.4) {
            const Flash = new THREE.PointLight(0xffff00, 2, 10)
            Flash.position.copy(itemData.mesh.position)
            scene.add(Flash)
            setTimeout(() => scene.remove(Flash), 185)
            itemData.collected = true
            ItensCount++
            const Dist = 100
            itemData.mesh.position.z = jogador.position.z + Dist
            itemData.mesh.position.x = THREE.MathUtils.randFloat(-5, 5)
            itemData.mesh.position.y = 2
            itemData.box.setFromObject(itemData.mesh)
        }
    })
}

// --- ADD Camera Follow Player Update Function --- //
function FCUPDT() {
    if (!jogador) return
    const Cupdt = jogador.position.clone().add(cameraoffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0), controls.getAzimuthalAngle()))
    camera.position.lerp(Cupdt, cameraSmoothness)
    const Clookat = jogador.position.clone().add(new THREE.Vector3(0, 3, 0))
    camera.lookAt(Clookat)
}

// --- ADD Ground Update Function --- //
function GUPDT() {
    if (!jogador) return
    groundsegment.forEach(segment => {
        if (jogador.position.z - segment.position.z > groundlenght){
            segment.position.z += groundlenght * groundsegment.length
    }})
}

// --- ADD Obstacles UPDATE FUNCTION --- //
function OBSTUPDT() {
    if (!jogador) return
    PlayerBox.setFromObject(jogador)
    obstacles.forEach(obstacleData => {
        if (jogador.position.z - obstacleData.mesh.position.z > 9) {
            obstacleData.mesh.position.z += obstacleSpacing * obstacles.length
            obstacleData.mesh.position.x = THREE.MathUtils.randFloat(-3, 3)
        }
        obstacleData.box.setFromObject(obstacleData.mesh)
        if (PlayerBox.intersectsBox(obstacleData.box)) {
            Colli()
        }
})}

// --- ADD Player Movement Update Function --- //
function JMUPDT() {
    if (!jogador || currentState !== GameState.RUNNING) return
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
    if (direction.length() === 0) return
    direction.normalize()

    const FKASNDA = jogador.position.clone()
    jogador.position.addScaledVector(direction, movespeed) // arrumar aqui adicionar a letra d no scale
    PlayerBox.setFromObject(jogador)

    for (const segment of wallsegment){
            for (const box of segment.boxs){ // alterei para boxs igual a linha 114
                if (PlayerBox.intersectsBox(box)) {
                    jogador.position.copy(FKASNDA)
    }}}
    const targetQuaternion = new THREE.Quaternion()
    targetQuaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1), direction.clone().normalize())
    jogador.quaternion.slerp(targetQuaternion, 0.18)            
}

// --- ADD lava update function --- //
function LAVUPDT(delta) {
    if (!jogador) return
    const GapZ = jogador.position.z - 20
    if (GapZ > lava.position.z) lava.position.z += SpeedL * (1 + DificultyMultiplier)
    lavaTexture.offset.y -= delta * 0.05
    lava.material.emissiveIntensity = 1.2 + Math.sin(performance.now() * 0.005) * 0.5
    lavaBox = new THREE.Box3().setFromObject(lava)
    if (jogador) {
        PlayerBox.setFromObject(jogador)
        if (PlayerBox.intersectsBox(lavaBox)) {
            Colli()
        }
    }
}

// --- Win Condition --- //
function CKWNCD () {
    if (ItensCount >= TotalItens) {
        currentState = GameState.GAMEOVER    
        alert("Parabens! Você conseguiu fazer sua obrigação!")
        setTimeout(() => {
            window.location.reload()
        }, 500)
}}

// --- ADD Score Update Function --- //
function SCRUPDT(delta) {
    if (currentState !== GameState.RUNNING) return
    if (!jogador) return
    const ScoreGain = runornot ? 2 : 1
    Score += delta * 15 * Multi * ScoreGain
    // Multi Mudanças
    if (!runornot){
        Multi -= delta * 0.15
        Multi = Math.max(1, Multi)
    }else {
        Multi += delta * 0.08
        Multi = Math.min(5, Multi)
    }
    stones.forEach(stoneData => {
        if (!stoneData || !stoneData.mesh) return
        const DistP = jogador.position.distanceTo(stoneData.mesh.position)
        if (DistP < FarScore) {
            Score += 3 * delta
            Multi += 0.08 * delta
        }
})}


function animate() {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (mixer) mixer.update(delta)

    updateHUD() // HUD update

    JMUPDT() // player movement update

    FCUPDT() //camera follow player update

    GUPDT() // ground update

    WUPDT() // walls update

    OBSTUPDT() // Obstacles update

    MVSTOUPDT(delta) // stone movement update

    OTHSTOUPDT(delta) // other stones movement update

    updateDifficulty(delta) // Difficulty update

    ITCUPDT() // itens count update

    LAVUPDT(delta) // lava update

    CKWNCD() // win condition check

    SCRUPDT(delta) // Score update

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