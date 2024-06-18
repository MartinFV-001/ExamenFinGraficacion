import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
};


class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    this._params = params;
    this._deceleration = new THREE.Vector3(-0.0005, -0.0001, -3.0);
    this._acceleration = new THREE.Vector3(1.1, 0.5, 30.0);
    this._velocity = new THREE.Vector3(0, 0, 0);

    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
      new BasicCharacterControllerProxy(this._animations));

    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/POWER/');
    loader.load('ROJO.fbx', (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });

      this._target = fbx;
      this._params.scene.add(this._target);

      this._mixer = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._stateMachine.SetState('idle');
      };

      const _OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);

        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };

      const loader = new FBXLoader(this._manager);
      loader.setPath('./resources/POWER/');
      loader.load('WALKR.fbx', (a) => { _OnLoad('walk', a); });
      loader.load('RUNR.fbx', (a) => { _OnLoad('run', a); });
      loader.load('IDLER.fbx', (a) => { _OnLoad('idle', a); });
      loader.load('SCARED.fbx', (a) => { _OnLoad('scare', a); });
      loader.load('DIER.fbx', (a) => { _OnLoad('die', a); });

    });
  }

  Update(timeInSeconds) {
    if (!this._target) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input);

    const velocity = this._velocity;
    const framedeceleration = new THREE.Vector3(
      velocity.x * this._deceleration.x,
      velocity.y * this._deceleration.y,
      velocity.z * this._deceleration.z
    );
    framedeceleration.multiplyScalar(timeInSeconds);
    framedeceleration.z = Math.sign(framedeceleration.z) * Math.min(
      Math.abs(framedeceleration.z), Math.abs(velocity.z));

    velocity.add(framedeceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    if (this._input._keys.shift) {
      acc.multiplyScalar(3.0);
    }

    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }
    if (this._input._keys.left) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
      _R.multiply(_Q);
    }

    controlObject.quaternion.copy(_R);

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    const demoInstance = _APP;
    if (demoInstance._RevisaColision(controlObject.position)) {
      controlObject.position.copy(oldPosition);
    }

    oldPosition.copy(controlObject.position);

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }

    if (this._params.camera) {
      const offset = new THREE.Vector3(0, 40, -40);
      offset.applyQuaternion(controlObject.quaternion);
      offset.add(controlObject.position);
      this._params.camera.position.copy(offset);
      this._params.camera.lookAt(controlObject.position);
    }
  }
}


class BasicCharacterControllerInput {
  constructor() {
    this._Init();
  }

  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
      scare: false,
      die: false,
    };
    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // W
        this._keys.forward = true;
        break;
      case 65: // A
        this._keys.left = true;
        break;
      case 83: // S
        this._keys.backward = true;
        break;
      case 68: // D
        this._keys.right = true;
        break;
      case 16: // SHIFT
        this._keys.shift = true;
        break;
      case 81: //  Q
        this._keys.scare = true;
        break;
      case 69: //  E
        this._keys.die = true;
        break;

    }
  }

  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87: // W
        this._keys.forward = false;
        break;
      case 65: // A
        this._keys.left = false;
        break;
      case 83: // S
        this._keys.backward = false;
        break;
      case 68: // D
        this._keys.right = false;
        break;
      case 16: // SHIFT
        this._keys.shift = false;
        break;
      case 81: //  q
        this._keys.scare = false;
        break;
      case 69: //  y
        this._keys.die = false;
        break;
    }
  }
};


class FiniteStateMachine {
  constructor() {
    this._states = {};
    this._currentState = null;
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;

    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
};


class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState('idle', IdleState);
    this._AddState('walk', WalkState);
    this._AddState('run', RunState);
    this._AddState('scare', ScareState); // Add this line
    this._AddState('die', DieState); // Add this line

  }
};


class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() { }
  Exit() { }
  Update() { }
};

class ScareState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'scare';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['scare'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;
      curAction.time = 0.0;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (!input._keys.scare) {
      this._parent.SetState('idle');
    }
  }
}

class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'walk';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['walk'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'run') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (input._keys.die) {
      this._parent.SetState('die');
      return;
    }
    if (input._keys.scare) {
      this._parent.SetState('scare');
      return;
    }
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState('run');
      }
      return;
    }

    this._parent.SetState('idle');
  }
};

class RunState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'run';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['run'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'walk') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(timeElapsed, input) {
    if (input._keys.scare) {
      this._parent.SetState('scare');
      return;
    }

    if (input._keys.forward || input._keys.backward) {
      if (input._keys.die) {
        this._parent.SetState('die');
        return;
      }
      if (!input._keys.shift) {
        this._parent.SetState('walk');
      }
      return;
    }

    this._parent.SetState('idle');
  }
};


class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'idle';
  }

  Enter(prevState) {
    const idleAction = this._parent._proxy._animations['idle'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {

    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState('walk');
    }
    if (input._keys.scare) {
      this._parent.SetState('scare');
      return;
    }
    if (input._keys.die) {
      this._parent.SetState('die');
      return;
    }
  }
};

class DieState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'die';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['die'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;
      curAction.time = 0.0;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (!input._keys.die) {
      this._parent.SetState('idle');
    }
  }
}


class CharacterControllerDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;

    this._scene = new THREE.Scene();


    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();

    // Change background color to blue
    this._scene.background = new THREE.Color(0x000000);
    // Configurar niebla (fog)
    this._scene.fog = new THREE.Fog(0xff0000, 0, 100);  // Color, near, far

    // Llama a la función para configurar la música
    this._SetupMusic();
    this._SetupMusic1();

    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 1000;
    light.shadow.camera.right = -1000;
    light.shadow.camera.top = 1000;
    light.shadow.camera.bottom = -1000;
    this._scene.add(light);

    light = new THREE.AmbientLight(0xFF0000, 0.25);
    this._scene.add(light);

    const controls = new OrbitControls(
      this._camera, this._threejs.domElement);
    controls.target.set(0, 20, 0);
    controls.update();

    // Change ground color to green
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1500, 1500, 0, 0),
      groundMaterial
    );
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    // Añadir el cubo negro al escenario
    const cubeGeometry = new THREE.BoxGeometry(30, 50, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    this._collisionCube = new THREE.Mesh(cubeGeometry, cubeMaterial);

    this._collisionCube.position.set(10, 5, 3); // Ajustar la posición del cubo
    this._collisionCube.castShadow = true;
    this._collisionCube.receiveShadow = true;
    this._scene.add(this._collisionCube);

    // Generate random rectangles and pyramids
    this.generateRectanges(this._scene);


    this._mixers = [];
    this._previousRAF = null;

    this._LoadAnimatedModel();
    this._RAF();
  }


  _SetupMusic() {
    // Obtén el elemento de audio
    this._bgMusic = document.getElementById('bgMusic');
  
    // Asegúrate de que el audio está cargado
    this._bgMusic.addEventListener('canplaythrough', () => {
      // Empieza a reproducir la música
      this._bgMusic.play();
  
      // Modificar el volumen del audio
      this._bgMusic.volume = 0.1; // Valor entre 0 (silencio) y 1 (volumen máximo)
    }, false);
  }

  _SetupMusic1() {
    // Obtén el elemento de audio
    this._bgMusic1 = document.getElementById('bgMusic1');

    // Asegúrate de que el audio está cargado
    this._bgMusic1.addEventListener('canplaythrough', () => {
      // Empieza a reproducir la música
      this._bgMusic1.play();
      // Modificar el volumen del audio
      this._bgMusic1.volume = 1; // Valor entre 0 (silencio) y 1 (volumen máximo)
    }, false);
  }

  _RevisaColision(characterPosition) {
    // Verificar colisión con el cubo negro
    const cubePosition = this._collisionCube.position;
    const distanceToCube = characterPosition.distanceTo(cubePosition);
    const collisionDistanceCube = 5.5 + 4.0; // Radio del personaje + Radio del cubo negro

    if (distanceToCube < collisionDistanceCube) {
      return true;
    }

    // Verificar colisión con los cubos generados aleatoriamente
    for (const object of this._collisionObjects) {
      const objectPosition = object.position;
      const distanceToObject = characterPosition.distanceTo(objectPosition);
      const collisionDistanceObject = 3.0 + 4.0; // Radio del personaje + Radio del cubo aleatorio

      if (distanceToObject < collisionDistanceObject) {
        return true;
      }
    }

    return false;
  }

  generateRectanges(scene) {
    const brownMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Color café (marrón) para los cubos

    const numCubes = 300;
    const maxDistance = 500;
    const minDistance = 30;

    this._collisionObjects = []; // Array para almacenar los cubos para detección de colisión

    for (let i = 0; i < numCubes; i++) {
      // Generar posiciones aleatorias dentro de un radio máximo
      const radius = (Math.random() * maxDistance) + minDistance;
      const angle = Math.random() * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = 0.5; // Altura sobre el plano

      // Crear el cubo
      const cubeGeometry = new THREE.BoxGeometry(20, 40, 2); // Dimensiones del cubo
      const cube = new THREE.Mesh(cubeGeometry, brownMaterial);
      cube.position.set(x, y, z);
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);

      // Crear el cubo
      const cubeGeometry1 = new THREE.BoxGeometry(10, 10, 10); // Dimensiones del cubo
      const cube1 = new THREE.Mesh(cubeGeometry1, brownMaterial);
      cube1.position.set(x, y, z);
      cube1.castShadow = true;
      cube1.receiveShadow = true;
      scene.add(cube1);


  
      cube.position.set(x, y, z);
      
      cube1.position.set(x, y, z);

  
      this._collisionObjects.push(cube);
    
      this._collisionObjects.push(cube1);
    }
  }

  _LoadAnimatedModel() {
    const params = {
      camera: this._camera,

      scene: this._scene,
    }
    this._controls = new BasicCharacterController(params);
  }

  _LoadAnimatedModelAndPlay(path, modelFile, animFile) {
    const loader = new FBXLoader();

    loader.setPath(path);
    loader.load(modelFile, (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });

      const params = {

        target: fbx,
        camera: this._camera,
        scene: this._scene,
      }

      this._controls = new BasicCharacterController(params);

      const animLoader = new FBXLoader();
      animLoader.setPath(path);
      animLoader.load(animFile, (anim) => {
        const m = new THREE.AnimationMixer(fbx);
        this._mixers.push(m);
        const idle = anim.animations[0];
        m.clipAction(idle).play();
      });
    });
  }


  _LoadModel() {
    const loader = new GLTFLoader();
    loader.load('./resources/thing.glb', (gltf) => {
      gltf.scene.traverse(c => {
        c.castShadow = true;
      });
      this._scene.add(gltf.scene);
    });
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) {
      this._mixers.map(m => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }
  }

}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new CharacterControllerDemo();
});
