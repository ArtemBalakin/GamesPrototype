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
            damage: 0,
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
    wave: 1,
    enemiesKilled: 0,
    isPlaying: false,
    isPaused: false,
    mouseMovement: { x: 0, y: 0 },
    keys: {},
    clock: new THREE.Clock()
};

// Initialize Game
function init() {
    const canvas = document.getElementById('canvas');

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

    // North wall
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(arenaSize, wallHeight, 1),
        wallMaterial
    );
    northWall.position.set(0, wallHeight/2, -arenaSize/2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    GameState.scene.add(northWall);

    // South wall
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(arenaSize, wallHeight, 1),
        wallMaterial
    );
    southWall.position.set(0, wallHeight/2, arenaSize/2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    GameState.scene.add(southWall);

    // East wall
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(1, wallHeight, arenaSize),
        wallMaterial
    );
    eastWall.position.set(arenaSize/2, wallHeight/2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    GameState.scene.add(eastWall);

    // West wall
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(1, wallHeight, arenaSize),
        wallMaterial
    );
    westWall.position.set(-arenaSize/2, wallHeight/2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    GameState.scene.add(westWall);
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
        isDead: false
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
        if (!GameState.isPlaying) return;

        GameState.keys[e.code] = true;

        if (e.code === 'KeyQ' || e.code === 'Digit1') {
            switchWeapon('light');
        } else if (e.code === 'Digit2') {
            switchWeapon('dark');
        } else if (e.code === 'Escape') {
            togglePause();
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

    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function switchWeapon(type) {
    if (type === GameState.weapons.current) return;

    GameState.weapons.current = type;
    const weapon = GameState.weapons[type];

    document.getElementById('weapon-name').textContent = weapon.name;
    document.getElementById('weapon-name').className = 'weapon-name weapon-' + type;
    document.getElementById('ammo-count').textContent = weapon.ammo;
}

function fire() {
    const now = Date.now();
    const weapon = GameState.weapons[GameState.weapons.current];

    if (now - weapon.lastFire < weapon.fireRate) return;
    if (weapon.ammo <= 0) {
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
        setTimeout(() => reload(), 100);
    }
}

function reload() {
    const weapon = GameState.weapons[GameState.weapons.current];
    if (weapon.ammo === weapon.maxAmmo) return;

    setTimeout(() => {
        weapon.ammo = weapon.maxAmmo;
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
        GameState.player.position.add(moveVector.multiplyScalar(GameState.player.moveSpeed * delta));
    }

    // Boundaries
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

            enemyPos.add(direction.multiplyScalar(enemy.speed * delta));
            enemy.head.position.set(enemyPos.x, enemyPos.y + 1.2, enemyPos.z);

            // Face player
            enemy.body.lookAt(playerPos);
        } else {
            // Attack player
            if (now - enemy.lastAttack > enemy.attackCooldown) {
                enemy.lastAttack = now;
                damagePlayer(enemy.damage);
            }
        }

        // Check shadow exposure
        if (enemy.shadowExposed) {
            if (now - enemy.shadowExposeTime > 3000) {
                enemy.shadowExposed = false;
            }
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

            if (distance < 1) {
                if (proj.type === 'light') {
                    // Light weapon exposes shadow
                    handleLightHit(proj, enemy);
                } else if (proj.type === 'dark') {
                    // Dark weapon damages if shadow is exposed
                    handleDarkHit(proj, enemy);
                }

                GameState.scene.remove(proj.mesh);
                return false;
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
    // Light hit creates a temporary light source that exposes the enemy's shadow
    const tempLight = new THREE.PointLight(0xffffaa, 2, 10);
    tempLight.position.copy(projectile.mesh.position);
    tempLight.castShadow = true;
    GameState.scene.add(tempLight);

    // Mark enemy shadow as exposed
    enemy.shadowExposed = true;
    enemy.shadowExposeTime = Date.now();

    // Visual feedback
    const flashGeometry = new THREE.SphereGeometry(2, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.5
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(projectile.mesh.position);
    GameState.scene.add(flash);

    setTimeout(() => {
        GameState.scene.remove(tempLight);
        GameState.scene.remove(flash);
    }, 500);
}

function handleDarkHit(projectile, enemy) {
    if (enemy.shadowExposed) {
        // Damage enemy
        enemy.health -= projectile.damage;

        // Visual damage effect
        enemy.body.material.emissiveIntensity = 1;
        setTimeout(() => {
            if (!enemy.isDead) {
                enemy.body.material.emissiveIntensity = 0.5;
            }
        }, 100);

        if (enemy.health <= 0) {
            killEnemy(enemy);
        }
    } else {
        // No damage - shadow not exposed
        createTextParticle('НЕ УЯЗВИМ', enemy.body.position, 0xff0000);
    }
}

function killEnemy(enemy) {
    enemy.isDead = true;
    GameState.enemiesKilled++;

    // Death animation
    const scale = { value: 1 };
    const interval = setInterval(() => {
        scale.value -= 0.05;
        enemy.body.scale.set(scale.value, scale.value, scale.value);
        enemy.head.scale.set(scale.value, scale.value, scale.value);

        if (scale.value <= 0) {
            clearInterval(interval);
            GameState.scene.remove(enemy.body);
            GameState.scene.remove(enemy.head);
            GameState.enemies = GameState.enemies.filter(e => e !== enemy);
            updateEnemyCount();
            checkWaveComplete();
        }
    }, 50);
}

function createTextParticle(text, position, color) {
    // Simple visual feedback - in a real game you'd use sprites or DOM elements
    console.log(text, 'at', position);
}

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
        document.getElementById('wave-count').textContent = GameState.wave;

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
    document.getElementById('health-fill').style.width = percent + '%';
}

function updateAmmoDisplay() {
    const weapon = GameState.weapons[GameState.weapons.current];
    document.getElementById('ammo-count').textContent = weapon.ammo;
}

function updateEnemyCount() {
    document.getElementById('enemy-count').textContent = GameState.enemies.length;
}

function togglePause() {
    GameState.isPaused = !GameState.isPaused;
    if (GameState.isPaused) {
        document.getElementById('menu').classList.remove('hidden');
        document.getElementById('start-btn').textContent = 'ПРОДОЛЖИТЬ';
    } else {
        document.getElementById('menu').classList.add('hidden');
        canvas.requestPointerLock();
    }
}

function startGame() {
    GameState.isPlaying = true;
    GameState.isPaused = false;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('game-over').classList.remove('show');
    canvas.requestPointerLock();

    // Reset if first start
    if (GameState.wave === 1 && GameState.enemies.length === 0) {
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
    GameState.projectiles = [];

    // Reset state
    GameState.player.health = GameState.player.maxHealth;
    GameState.player.position.set(0, 1.7, 0);
    GameState.wave = 1;
    GameState.enemiesKilled = 0;
    GameState.weapons.light.ammo = GameState.weapons.light.maxAmmo;
    GameState.weapons.dark.ammo = GameState.weapons.dark.maxAmmo;
    switchWeapon('light');

    updateHealthDisplay();
    updateAmmoDisplay();
    document.getElementById('wave-count').textContent = GameState.wave;
    updateEnemyCount();

    startGame();
}

function gameOver(victory) {
    GameState.isPlaying = false;

    const title = document.getElementById('game-over-title');
    const stats = document.getElementById('game-over-stats');

    if (victory) {
        title.textContent = 'ПОБЕДА';
        title.className = 'game-over-title victory';
        stats.textContent = `Волна ${GameState.wave} пройдена! Убито врагов: ${GameState.enemiesKilled}`;
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
    GameState.camera.aspect = window.innerWidth / window.innerHeight;
    GameState.camera.updateProjectionMatrix();
    GameState.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start initialization when page loads
window.addEventListener('load', init);
