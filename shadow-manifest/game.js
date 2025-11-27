// Game State
const GameState = {
    scene: null,
    camera: null,
    renderer: null,
    player: {
        mesh: null,
        height: 1.7,
        moveSpeed: 5,
        lookSpeed: 0.002,
        health: 100,
        maxHealth: 100,
        position: new THREE.Vector3(0, 1.7, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        rotation: { x: 0, y: 0 }
    },
    weapons: {
        current: 'light',
        light: {
            name: 'Световой Эмиттер',
            ammo: 30,
            maxAmmo: 30,
            damage: 0, // No direct damage
            reloadTime: 1500,
            fireRate: 200,
            lastFire: 0,
            projectileSpeed: 30,
            color: 0xffff00
        },
        dark: {
            name: 'Поглотитель Тьмы',
            ammo: 20,
            maxAmmo: 20,
            damage: 25,
            reloadTime: 2000,
            fireRate: 300,
            lastFire: 0,
            projectileSpeed: 25,
            color: 0x8000ff
        }
    },
    enemies: [],
    projectiles: [],
    lights: [],
    collidableObjects: [], // NEW: Список объектов для проверки столкновений
    wave: 1,
    enemiesKilled: 0,
    isPlaying: false,
    isPaused: true, // Начинаем с паузы для меню
    isReloading: false, // NEW: Состояние перезарядки
    mouseMovement: { x: 0, y: 0 },
    keys: {},
    clock: new THREE.Clock()
};

// DOM Elements
const menuElement = document.getElementById('menu');
const healthFill = document.getElementById('health-fill');
const enemyCountDisplay = document.getElementById('enemy-count');
const waveCountDisplay = document.getElementById('wave-count');
const weaponNameDisplay = document.getElementById('weapon-name');
const ammoCountDisplay = document.getElementById('ammo-count');
const ammoMaxDisplay = document.getElementById('ammo-max');
const reloadHint = document.getElementById('reload-hint');
const canvas = document.getElementById('canvas');


// Initialize Game
function init() {
    // Setup Renderer
    GameState.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });
    GameState.renderer.setSize(window.innerWidth, window.innerHeight);
    GameState.renderer.shadowMap.enabled = true;
    GameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Setup Scene
    GameState.scene = new THREE.Scene();
    GameState.scene.fog = new THREE.Fog(0x000020, 1, 50);

    // Setup Camera
    GameState.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    GameState.camera.position.copy(GameState.player.position);

    // Create Environment
    createEnvironment();

    // Event Listeners
    setupEventListeners();

    // Start Menu
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    // Initial HUD update
    switchWeapon(GameState.weapons.current);
    updateAmmoDisplay();

    // Animation Loop
    animate();
}

function createEnvironment() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    GameState.scene.add(ground);

    // Walls
    createWalls();

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    GameState.scene.add(ambientLight);

    // Main overhead lights (will cast shadows for enemies)
    createOverheadLights();

    // Add some obstacles/cover
    createObstacles();
}

function createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a40,
        roughness: 0.9
    });

    const wallHeight = 5;
    const arenaSize = 40;
    const wallThickness = 1;

    const wallGeometryZ = new THREE.BoxGeometry(arenaSize, wallHeight, wallThickness);
    const wallGeometryX = new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize);

    // North wall
    const northWall = new THREE.Mesh(wallGeometryZ, wallMaterial);
    northWall.position.set(0, wallHeight/2, -arenaSize/2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    GameState.scene.add(northWall);
    GameState.collidableObjects.push(northWall);

    // South wall
    const southWall = new THREE.Mesh(wallGeometryZ, wallMaterial);
    southWall.position.set(0, wallHeight/2, arenaSize/2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    GameState.scene.add(southWall);
    GameState.collidableObjects.push(southWall);

    // East wall
    const eastWall = new THREE.Mesh(wallGeometryX, wallMaterial);
    eastWall.position.set(arenaSize/2, wallHeight/2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    GameState.scene.add(eastWall);
    GameState.collidableObjects.push(eastWall);

    // West wall
    const westWall = new THREE.Mesh(wallGeometryX, wallMaterial);
    westWall.position.set(-arenaSize/2, wallHeight/2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    GameState.scene.add(westWall);
    GameState.collidableObjects.push(westWall);
}

function createOverheadLights() {
    const positions = [
        { x: -10, z: -10 },
        { x: 10, z: -10 },
        { x: -10, z: 10 },
        { x: 10, z: 10 },
        { x: 0, z: 0 }
    ];

    positions.forEach(pos => {
        const light = new THREE.PointLight(0xffffff, 0.6, 30);
        light.position.set(pos.x, 8, pos.z);
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        GameState.scene.add(light);
        GameState.lights.push(light);

        // Visual lamp
        const lampGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
        lamp.position.copy(light.position);
        GameState.scene.add(lamp);
    });
}

function createObstacles() {
    const obstacleMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3a5a,
        roughness: 0.7
    });

    const obstacles = [
        { x: -8, z: 0, w: 2, h: 3, d: 2 },
        { x: 8, z: 0, w: 2, h: 3, d: 2 },
        { x: 0, z: -8, w: 2, h: 3, d: 2 },
        { x: 0, z: 8, w: 2, h: 3, d: 2 },
        { x: -15, z: -15, w: 3, h: 2, d: 3 },
        { x: 15, z: 15, w: 3, h: 2, d: 3 }
    ];

    obstacles.forEach(obs => {
        const obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(obs.w, obs.h, obs.d),
            obstacleMaterial
        );
        obstacle.position.set(obs.x, obs.h/2, obs.z);
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        GameState.scene.add(obstacle);
        GameState.collidableObjects.push(obstacle); // Добавление в список коллизий
    });
}

function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    // Enemy body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0x330000,
        emissiveIntensity: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(x, 1, z);
    body.castShadow = true;
    body.receiveShadow = true;

    // Enemy head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6666,
        emissive: 0x440000,
        emissiveIntensity: 0.3
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(x, 2.2, z);
    head.castShadow = true;

    GameState.scene.add(body);
    GameState.scene.add(head);

    // Сохраняем исходные цвета
    const originalBodyColor = bodyMaterial.color.clone();
    const originalHeadColor = headMaterial.color.clone();

    const enemy = {
        body,
        head,
        health: 50 + GameState.wave * 10,
        maxHealth: 50 + GameState.wave * 10,
        speed: 1.5 + GameState.wave * 0.2,
        damage: 10 + GameState.wave * 2,
        lastAttack: 0,
        attackCooldown: 2000,
        shadowExposed: false,
        shadowExposeTime: 0,
        isDead: false,
        originalBodyColor: originalBodyColor,
        originalHeadColor: originalHeadColor,
        radius: 0.5 // Радиус для коллизии
    };

    GameState.enemies.push(enemy);
    updateEnemyCount();
}

function setupEventListeners() {
    // Mouse movement
    document.addEventListener('mousemove', (e) => {
        if (!GameState.isPlaying || GameState.isPaused) return;
        GameState.mouseMovement.x += e.movementX;
        GameState.mouseMovement.y += e.movementY;
    });

    // Mouse click
    document.addEventListener('mousedown', (e) => {
        if (!GameState.isPlaying || GameState.isPaused) return;
        if (e.button === 0) {
            fire();
        }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            togglePause();
            return;
        }

        if (!GameState.isPlaying || GameState.isPaused) return;

        GameState.keys[e.code] = true;

        if (e.code === 'KeyQ' || e.code === 'Digit1') {
            switchWeapon('light');
        } else if (e.code === 'Digit2') {
            switchWeapon('dark');
        }
    });

    document.addEventListener('keyup', (e) => {
        GameState.keys[e.code] = false;
    });

    // Pointer lock
    canvas.addEventListener('click', () => {
        if (GameState.isPlaying && !GameState.isPaused) {
            canvas.requestPointerLock();
        }
    });

    // Pointer lock change listener for pause menu consistency
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== canvas && GameState.isPlaying && !GameState.isPaused) {
            togglePause();
        }
    });


    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function switchWeapon(type) {
    if (type === GameState.weapons.current) return;

    GameState.weapons.current = type;
    const weapon = GameState.weapons[type];

    weaponNameDisplay.textContent = weapon.name;
    weaponNameDisplay.className = 'weapon-name weapon-' + type;
    updateAmmoDisplay();
}

function fire() {
    const now = Date.now();
    const weapon = GameState.weapons[GameState.weapons.current];

    if (now - weapon.lastFire < weapon.fireRate) return;
    if (weapon.ammo <= 0 || GameState.isReloading) {
        reload();
        return;
    }

    weapon.lastFire = now;
    weapon.ammo--;
    updateAmmoDisplay();

    const direction = new THREE.Vector3();
    GameState.camera.getWorldDirection(direction);

    createProjectile(
        GameState.camera.position.clone(),
        direction,
        weapon
    );

    // Auto reload
    if (weapon.ammo === 0) {
        // Небольшая задержка, чтобы выстрел успел зарегистрироваться
        setTimeout(() => reload(), 100);
    }
}

function reload() {
    const weapon = GameState.weapons[GameState.weapons.current];
    if (weapon.ammo === weapon.maxAmmo || GameState.isReloading) return;

    GameState.isReloading = true;
    if (reloadHint) reloadHint.style.display = 'block';

    setTimeout(() => {
        weapon.ammo = weapon.maxAmmo;
        GameState.isReloading = false;
        if (reloadHint) reloadHint.style.display = 'none';
        updateAmmoDisplay();
    }, weapon.reloadTime);
}

function createProjectile(position, direction, weapon) {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: weapon.color,
        transparent: true,
        opacity: 0.9
    });
    const projectile = new THREE.Mesh(geometry, material);
    projectile.position.copy(position);

    // Add glow
    const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: weapon.color,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    projectile.add(glow);

    GameState.scene.add(projectile);

    GameState.projectiles.push({
        mesh: projectile,
        velocity: direction.multiplyScalar(weapon.projectileSpeed),
        type: GameState.weapons.current,
        damage: weapon.damage,
        lifetime: 3000,
        createdAt: Date.now()
    });
}

// --- Collision Helpers ---
const tempBox = new THREE.Box3();
const playerSphere = new THREE.Sphere(undefined, 0.5);

function checkPlayerCollision(nextPosition) {
    // Игрок - это сфера с радиусом 0.5
    playerSphere.center.copy(nextPosition);
    playerSphere.center.y = GameState.player.height;

    for (const mesh of GameState.collidableObjects) {
        tempBox.setFromObject(mesh);
        // Проверка пересечения сферы игрока с AABB (ограничивающим параллелепипедом) объекта
        if (tempBox.intersectsSphere(playerSphere)) {
            return true; // Столкновение обнаружено
        }
    }
    return false;
}

function updatePlayer(delta) {
    // Mouse look
    GameState.player.rotation.y -= GameState.mouseMovement.x * GameState.player.lookSpeed;
    GameState.player.rotation.x -= GameState.mouseMovement.y * GameState.player.lookSpeed;
    GameState.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, GameState.player.rotation.x));
    GameState.mouseMovement.x = 0;
    GameState.mouseMovement.y = 0;

    // Apply rotation
    GameState.camera.rotation.order = 'YXZ';
    GameState.camera.rotation.y = GameState.player.rotation.y;
    GameState.camera.rotation.x = GameState.player.rotation.x;

    // Movement
    const moveVector = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(GameState.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(GameState.camera.quaternion);

    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    if (GameState.keys['KeyW']) moveVector.add(forward);
    if (GameState.keys['KeyS']) moveVector.sub(forward);
    if (GameState.keys['KeyD']) moveVector.add(right);
    if (GameState.keys['KeyA']) moveVector.sub(right);

    if (moveVector.length() > 0) {
        moveVector.normalize();

        const movement = moveVector.clone().multiplyScalar(GameState.player.moveSpeed * delta);
        const nextPosition = GameState.player.position.clone().add(movement);

        // COLLISION CHECK
        if (!checkPlayerCollision(nextPosition)) {
            GameState.player.position.copy(nextPosition);
        } else {
            // Если столкновение, пытаемся двигаться только по одной оси (X или Z)
            const nextX = GameState.player.position.clone().add(new THREE.Vector3(movement.x, 0, 0));
            if (!checkPlayerCollision(nextX)) {
                GameState.player.position.copy(nextX);
            } else {
                const nextZ = GameState.player.position.clone().add(new THREE.Vector3(0, 0, movement.z));
                if (!checkPlayerCollision(nextZ)) {
                    GameState.player.position.copy(nextZ);
                }
            }
        }
    }

    // Boundaries (Раньше это было единственной коллизией)
    const boundary = 18;
    GameState.player.position.x = Math.max(-boundary, Math.min(boundary, GameState.player.position.x));
    GameState.player.position.z = Math.max(-boundary, Math.min(boundary, GameState.player.position.z));

    GameState.camera.position.copy(GameState.player.position);
}

function updateEnemies(delta) {
    const now = Date.now();

    GameState.enemies.forEach(enemy => {
        if (enemy.isDead) return;

        const enemyPos = enemy.body.position;
        const playerPos = GameState.player.position;
        const distance = enemyPos.distanceTo(playerPos);

        if (distance > 2) {
            // Move towards player
            const direction = new THREE.Vector3()
                .subVectors(playerPos, enemyPos)
                .normalize();

            direction.y = 0;
            const movement = direction.clone().multiplyScalar(enemy.speed * delta);
            const nextPosition = enemyPos.clone().add(movement);

            // ENEMY COLLISION CHECK (остановка при столкновении)
            let collided = false;

            // Check against walls/obstacles
            for (const mesh of GameState.collidableObjects) {
                tempBox.setFromObject(mesh);
                const enemySphere = new THREE.Sphere(nextPosition, enemy.radius);
                if (tempBox.intersectsSphere(enemySphere)) {
                    collided = true;
                    break;
                }
            }

            // Check against other enemies
            for (const otherEnemy of GameState.enemies) {
                if (otherEnemy !== enemy && !otherEnemy.isDead) {
                    const distanceToOther = nextPosition.distanceTo(otherEnemy.body.position);
                    if (distanceToOther < enemy.radius + otherEnemy.radius) {
                        collided = true;
                        break;
                    }
                }
            }

            if (!collided) {
                enemyPos.copy(nextPosition);
            }

            // Correct head position to follow body
            enemy.head.position.set(enemyPos.x, enemyPos.y + 1.2, enemyPos.z);

            // Face player
            enemy.body.lookAt(playerPos.x, enemyPos.y, playerPos.z);
            enemy.head.lookAt(playerPos.x, enemyPos.y + 1.2, playerPos.z);

        } else {
            // Attack player
            if (now - enemy.lastAttack > enemy.attackCooldown) {
                enemy.lastAttack = now;
                damagePlayer(enemy.damage);
            }
        }

        // Refined Check shadow exposure duration and visual
        if (enemy.shadowExposed) {
            if (now - enemy.shadowExposeTime > 3000) {
                enemy.shadowExposed = false;
                // Revert color
                enemy.body.material.color.copy(enemy.originalBodyColor);
                enemy.head.material.color.copy(enemy.originalHeadColor);
            } else {
                // Flash/Glow effect to show exposure
                const timeFactor = Math.sin(now * 0.01) * 0.5 + 0.5; // Sine wave for pulsing
                enemy.body.material.emissiveIntensity = 0.5 + timeFactor * 0.5; // Pulse from 0.5 to 1.0
            }
        } else {
            enemy.body.material.emissiveIntensity = 0.5; // Default intensity
        }
    });
}

function updateProjectiles(delta) {
    const now = Date.now();

    GameState.projectiles = GameState.projectiles.filter(proj => {
        if (now - proj.createdAt > proj.lifetime) {
            GameState.scene.remove(proj.mesh);
            return false;
        }

        proj.mesh.position.add(proj.velocity.clone().multiplyScalar(delta));

        // Check collision with enemies
        for (let i = 0; i < GameState.enemies.length; i++) {
            const enemy = GameState.enemies[i];
            if (enemy.isDead) continue;

            const distance = proj.mesh.position.distanceTo(enemy.body.position);

            if (distance < 1) { // Hit registered
                if (proj.type === 'light') {
                    handleLightHit(proj, enemy);
                } else if (proj.type === 'dark') {
                    handleDarkHit(proj, enemy);
                }

                GameState.scene.remove(proj.mesh);
                return false; // Projectile is removed
            }
        }

        // Check boundaries
        if (Math.abs(proj.mesh.position.x) > 50 ||
            Math.abs(proj.mesh.position.z) > 50 ||
            proj.mesh.position.y < 0 || proj.mesh.position.y > 20) {
            GameState.scene.remove(proj.mesh);
            return false;
        }

        return true;
    });
}

function handleLightHit(projectile, enemy) {
    // Light hit sets enemy to 'shadowExposed' state for 3 seconds
    enemy.shadowExposed = true;
    enemy.shadowExposeTime = Date.now();

    // Visual feedback: Change color to bright cyan to indicate exposure
    enemy.body.material.color.set(0x00ffff);
    enemy.head.material.color.set(0x00ffff);

    // Simple light effect for the flash
    const tempLight = new THREE.PointLight(0xffffaa, 5, 5);
    tempLight.position.copy(projectile.mesh.position);
    GameState.scene.add(tempLight);

    setTimeout(() => {
        GameState.scene.remove(tempLight);
    }, 200);

    // createTextParticle('ЗАСВЕЧЕН!', enemy.body.position, 0x00ffff);
}

function handleDarkHit(projectile, enemy) {
    if (enemy.shadowExposed) {
        // Damage enemy only if shadow is exposed
        enemy.health -= projectile.damage;

        // Visual damage effect
        enemy.body.material.emissiveIntensity = 2.0; // Intense flash
        enemy.body.material.color.set(0xaa00ff); // Purple hit indicator

        setTimeout(() => {
            if (!enemy.isDead) {
                // Revert to exposed color or original color if exposure time passed
                if (enemy.shadowExposed) {
                    enemy.body.material.color.set(0x00ffff);
                    enemy.head.material.color.set(0x00ffff);
                } else {
                    enemy.body.material.color.copy(enemy.originalBodyColor);
                    enemy.head.material.color.copy(enemy.originalHeadColor);
                }
                enemy.body.material.emissiveIntensity = 0.5;
            }
        }, 100);

        // createTextParticle(`-${projectile.damage} HP`, enemy.body.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xaa00ff);

        if (enemy.health <= 0) {
            killEnemy(enemy);
        }
    } else {
        // No damage - shadow not exposed (Dark bullet is absorbed harmlessly)
        // createTextParticle('НЕ УЯЗВИМ', enemy.body.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff0000);
    }
}

function killEnemy(enemy) {
    enemy.isDead = true;
    GameState.enemiesKilled++;

    // Death animation: fade and sink
    const interval = setInterval(() => {
        if (!enemy.body || !enemy.head) return; // Prevent errors if removed too quickly

        // Scale and sink
        enemy.body.scale.multiplyScalar(0.95);
        enemy.head.scale.multiplyScalar(0.95);
        enemy.body.position.y -= 0.05;
        enemy.head.position.y -= 0.05;

        if (enemy.body.scale.x < 0.1) {
            clearInterval(interval);
            GameState.scene.remove(enemy.body);
            GameState.scene.remove(enemy.head);
            GameState.enemies = GameState.enemies.filter(e => e !== enemy);
            updateEnemyCount();
            checkWaveComplete();
        }
    }, 50);
}

// function createTextParticle(text, position, color) { /* ... */ } // Убрано для простоты, используется console.log

function damagePlayer(damage) {
    GameState.player.health -= damage;
    GameState.player.health = Math.max(0, GameState.player.health);
    updateHealthDisplay();

    // Screen flash effect
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(255, 0, 0, 0.3)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1000';
    document.body.appendChild(overlay);

    setTimeout(() => {
        document.body.removeChild(overlay);
    }, 100);

    if (GameState.player.health <= 0) {
        gameOver(false);
    }
}

function checkWaveComplete() {
    if (GameState.enemies.length === 0 && GameState.isPlaying) {
        GameState.wave++;
        waveCountDisplay.textContent = GameState.wave;

        // Пример: Победа после волны 5
        if (GameState.wave > 5) {
            gameOver(true);
            return;
        }

        setTimeout(() => {
            spawnWave();
        }, 2000);
    }
}

function spawnWave() {
    const enemyCount = 3 + GameState.wave;
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            spawnEnemy();
        }, i * 500);
    }
}

function updateHealthDisplay() {
    const percent = (GameState.player.health / GameState.player.maxHealth) * 100;
    healthFill.style.width = percent + '%';
}

function updateAmmoDisplay() {
    const weapon = GameState.weapons[GameState.weapons.current];
    ammoCountDisplay.textContent = GameState.isReloading ? '...' : weapon.ammo; // Показывать "..." при перезарядке
    ammoMaxDisplay.textContent = weapon.maxAmmo === Infinity ? '∞' : weapon.maxAmmo;
}

function updateEnemyCount() {
    enemyCountDisplay.textContent = GameState.enemies.length;
}

function togglePause() {
    GameState.isPaused = !GameState.isPaused;
    if (GameState.isPaused) {
        menuElement.classList.remove('hidden');
        document.getElementById('start-btn').textContent = 'ПРОДОЛЖИТЬ';
        document.exitPointerLock();
    } else {
        menuElement.classList.add('hidden');
        canvas.requestPointerLock();
    }
}

function startGame() {
    GameState.isPlaying = true;
    GameState.isPaused = false;
    menuElement.classList.add('hidden');
    document.getElementById('game-over').classList.remove('show');
    canvas.requestPointerLock();
    if (reloadHint) reloadHint.style.display = 'none';

    // Reset if first start or after restart
    if (GameState.enemies.length === 0) {
        spawnWave();
    }
}

function restartGame() {
    // Clear enemies
    GameState.enemies.forEach(enemy => {
        GameState.scene.remove(enemy.body);
        GameState.scene.remove(enemy.head);
    });
    GameState.enemies = [];

    // Clear projectiles
    GameState.projectiles.forEach(proj => {
        GameState.scene.remove(proj.mesh);
    });
    GameState.projectiles.length = 0;

    // Reset state
    GameState.player.health = GameState.player.maxHealth;
    GameState.player.position.set(0, 1.7, 0);
    GameState.wave = 1;
    GameState.enemiesKilled = 0;
    GameState.weapons.light.ammo = GameState.weapons.light.maxAmmo;
    GameState.weapons.dark.ammo = GameState.weapons.dark.maxAmmo;
    GameState.isReloading = false;

    // Reset camera position/rotation
    GameState.player.rotation.x = 0;
    GameState.player.rotation.y = 0;

    switchWeapon('light');

    updateHealthDisplay();
    document.getElementById('wave-count').textContent = GameState.wave;
    updateEnemyCount();

    // Hide game over and start game
    document.getElementById('game-over').classList.remove('show');
    startGame();
}

function gameOver(victory) {
    GameState.isPlaying = false;
    GameState.isPaused = true;

    const title = document.getElementById('game-over-title');
    const stats = document.getElementById('game-over-stats');

    if (victory) {
        title.textContent = 'ПОБЕДА';
        title.className = 'game-over-title victory';
        stats.textContent = `Вы прошли игру! Убито врагов: ${GameState.enemiesKilled}`;
    } else {
        title.textContent = 'ПОРАЖЕНИЕ';
        title.className = 'game-over-title defeat';
        stats.textContent = `Вы продержались до волны ${GameState.wave}. Убито врагов: ${GameState.enemiesKilled}`;
    }

    document.getElementById('game-over').classList.add('show');
    document.exitPointerLock();
}

function animate() {
    requestAnimationFrame(animate);

    const delta = GameState.clock.getDelta();

    if (GameState.isPlaying && !GameState.isPaused) {
        updatePlayer(delta);
        updateEnemies(delta);
        updateProjectiles(delta);
    }

    GameState.renderer.render(GameState.scene, GameState.camera);
}

function onWindowResize() {
    if (GameState.camera) {
        GameState.camera.aspect = window.innerWidth / window.innerHeight;
        GameState.camera.updateProjectionMatrix();
    }
    if (GameState.renderer) {
        GameState.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Start initialization when page loads
window.addEventListener('load', init);