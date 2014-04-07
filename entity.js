/* exported ej */
/* global getWebGLContext, initShaders, Matrix4 */

var _class_entity_js = function() {
	// Private
	var g_Canvas;
	var p_Frames = 0;
	var p_FPS = 0;
	var u_ViewMatrix;
	var u_ProjMatrix;
	var u_ModelMatrix;
	var u_NormalMatrix;
	var u_CameraPos;
	var u_MaterialID;
	var SIZE = 3;
	var FSIZE = new Uint16Array().BYTES_PER_ELEMENT;
	var gl;

	// Interface
	var object = function() {};

	// Interface Functions
	object.prototype.gl = function() {
		return gl;
	};

	var resize = function() {
		gl = getWebGLContext(g_Canvas, false);
		if (!gl)
			throw 'Failed to get WebGL context';
		g_Canvas.width = window.innerWidth;
		g_Canvas.height = window.innerHeight;
		for (var i=0; i < g_CameraStack.length; i++) {
			g_CameraStack[i].resize();
		}
	};
	object.prototype.resize = resize;
	
	object.prototype.init = function(el, vs_Source, fs_Source) {
		g_Canvas = document.getElementById(el);
		gl = getWebGLContext(g_Canvas, false);

		if (!initShaders(gl, vs_Source, fs_Source))
			throw 'Failed to initialize shaders';

		u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
		if (u_ModelMatrix < 0)
			throw 'Failed to get location of u_ModelMatrix';

		u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
		if (u_NormalMatrix < 0)
			throw 'Failed to get location of u_NormalMatrix';

		u_ViewProjMatrix = gl.getUniformLocation(gl.program, 'u_ViewProjMatrix');
		if (u_ViewProjMatrix < 0)
			throw 'Failed to get location of u_ViewProjMatrix';

		u_CameraPos = gl.getUniformLocation(gl.program, 'u_CameraPos');
		if (u_CameraPos < 0)
			throw 'Failed to get location of u_CameraPos';

		u_MaterialID = gl.getUniformLocation(gl.program, 'u_MaterialID');
		if (u_MaterialID < 0)
			throw 'Failed to get location of u_MaterialID';

		gl.enable(gl.DEPTH_TEST);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);

		window.setInterval(function() {
			p_FPS = p_Frames;
			p_Frames = 0;
		}, 1000);
	};

	object.prototype.useMaterial = function(index) {
		gl.uniform1i(u_MaterialID, index);
	};

	object.prototype.getFPS = function() {
		return p_FPS;
	};

	var g_MatStack = [];

	object.prototype.pushMatrix = function(mat) {
		g_MatStack.push(new Matrix4(mat));
	};

	object.prototype.popMatrix = function() {
		return new Matrix4(g_MatStack.pop());
	};

	object.prototype.canvas = function() {
		return g_Canvas;
	};

	var g_vertices = [];
	var g_normals = [];
	var g_indices = [];

	object.prototype.getArrayDraw = function(vertices, normals, modeString) {
		if (vertices.length != normals.length) {
			return false;
		}

		var offset = g_vertices.length / SIZE;
		var count = vertices.length / SIZE;
		var mode = gl[modeString.toUpperCase()];

		g_vertices = g_vertices.concat(vertices);
		g_normals = g_normals.concat(normals);

		return function(gl) {
			set();
			gl.drawArrays(mode, offset, count);
		};
	};

	object.prototype.getElementsDraw = function(vertices, normals, indices, modeString) {
		if (vertices.length != normals.length) {
			return false;
		}

		var offset = g_indices.length;
		var count = indices.length;
		var mode = gl[modeString.toUpperCase()];

		var vOffset = g_vertices.length / SIZE;

		g_vertices = g_vertices.concat(vertices);
		g_normals = g_normals.concat(normals);

		for(var i=0; i<indices.length; i++) {
			g_indices.push(indices[i] + vOffset);
		}

		return function(gl) {
			set();
			gl.drawElements(mode, count, gl.UNSIGNED_SHORT, offset*FSIZE);
		};
	};

	object.prototype.initVertexBuffer = function() {
		var vertexBuffer = gl.createBuffer();
		var normalBuffer = gl.createBuffer();
		var indexBuffer = gl.createBuffer();

		if(!vertexBuffer || !indexBuffer || !normalBuffer)
			throw 'Failed to create the buffer object.';

		var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
		if (a_Position < 0)
			throw 'Failed to get the storage location of a_Position';

		var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
		if (a_Normal < 0)
			throw 'Failed to get the storage location of a_Normal';

		var vertices = new Float32Array(g_vertices);
		var normals = new Float32Array(g_normals);

		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
		gl.vertexAttribPointer(a_Position, SIZE, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(a_Position);

		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
		gl.vertexAttribPointer(a_Normal, SIZE, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(a_Normal);

		var indices = new Uint16Array(g_indices);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
	};

	var g_ModelMatrix = new Matrix4();
	var g_NormalMatrix = new Matrix4();
	var g_LastTick = Date.now();

	object.prototype.begin = function() {
		for (var i = 0; i < g_CameraStack.length; i++) {
			g_CameraStack[i].init();
		}
		resize();

		var frame = function() {
			var now = Date.now();
			var dt = now - g_LastTick;
			g_LastTick = now;

			for (var i=0; i<g_EntityStack.length; i++) {
				g_EntityStack[i].update(dt);
			}

			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			for (var j=0; j<g_CameraStack.length; j++) {
				g_CameraStack[j].update(dt);
				g_CameraStack[j].setup();

				for(var i=0; i < g_EntityStack.length; i++) {
					g_ModelMatrix = new Matrix4();
					set();
					g_EntityStack[i].draw(gl);
				}
			}
			p_Frames++;
			window.requestAnimationFrame(frame);
		};
		frame();
	};

	object.prototype.modelMatrix = function() {
		return g_ModelMatrix;
	};

	var set = function() {
		gl.uniformMatrix4fv(u_ModelMatrix, false, g_ModelMatrix.elements);
		g_NormalMatrix.setInverseOf(g_ModelMatrix);
		g_NormalMatrix.transpose();
		gl.uniformMatrix4fv(u_NormalMatrix, false, g_NormalMatrix.elements);
	};
	object.prototype.set = set;

	var g_CameraStack = [];

	object.prototype.addCamera = function(cam) {
		g_CameraStack.push(cam);
	};

	var g_ViewProjMatrix = new Matrix4();

	var camera = function(initialize, resize, update) {
		var view = new Matrix4();
		this.view = function() { return view; };
		var proj = new Matrix4();
		this.proj = function() { return proj; };
		var x = 0, y = 0, w = 0, h = 0;

		this.setViewport = function(this_x, this_y, this_w, this_h) {
			x = this_x;
			y = this_y;
			w = this_w;
			h = this_h;
		};

		this.updateCameraPos = function(x, y, z) {
			gl.uniform4f(u_CameraPos, x, y, z, 1.0);
		}

		this.init = initialize;
		this.resize = function() { resize(g_Canvas.width, g_Canvas.height); };
		this.update = update || function(dt) {};

		this.setup = function() {
			gl.viewport(x, y, w, h);
			g_ViewProjMatrix.set(proj);
			g_ViewProjMatrix.multiply(view);
			gl.uniformMatrix4fv(u_ViewProjMatrix, false, g_ViewProjMatrix.elements);
		};

		this.remove = function() {
			g_CameraStack.splice(g_CameraStack.indexOf(this), 1);
		};
	};
	object.prototype.camera = camera;

	var g_EntityStack = [];

	object.prototype.addEntity = function(ent) {
		g_EntityStack.push(ent);
	};

	var entity = function() {
		this.draw = function(gl) {};

		this.update = function(dt) {};

		this.remove = function() {
			g_EntityStack.splice(g_EntityStack.indexOf(this), 1);
		};
	};
	object.prototype.entity = entity;

	var transNode = function(opt_matrix) {
		var matrix = new Matrix4(opt_matrix);
		this.matrix = matrix;
		var children = [];
		this.children = children;

		this.add = function(node) {
			children.push(node);
			return node;
		};
	};
	object.prototype.transNode = transNode;

	var drawNode = function(method) {
		this.draw = method;
	};
	object.prototype.drawNode = drawNode;

	var traverse = function(node, myGl) {
		if(node.draw) {
			node.draw(myGl);
		}
		else {
			g_ModelMatrix.multiply(node.matrix);
			var state = new Matrix4(g_ModelMatrix);
			for(var i = 0; i < node.children.length; i++) {
				traverse(node.children[i], myGl);
				g_ModelMatrix.set(state);
			}
		}
	};

	var jointedEntity = function() {
		var _root = new transNode();

		this.root = function() {
			return _root;
		};

		this.draw = function(myGl) {
			traverse(_root, myGl);
		};
	};
	jointedEntity.prototype = new entity();
	object.prototype.jointedEntity = jointedEntity;

	var pointLight = function(name, opt_x, opt_y, opt_z) {
		var x = opt_x || 0;
		var y = opt_y || 0;
		var z = opt_z || 0;
		var ar = 0.25, ag = 0.25, ab = 0.25;
		var dr = 0.25, dg = 0.25, db = 0.25;
		var sr = 0.25, sg = 0.25, sb = 0.25, sa = 1.0;

		this.setPosition = function(new_x, new_y, new_z) {
			x = new_x, y = new_y, z = new_z;
		};

		this.getPosition = function() {
			return [x, y, z];
		};

		this.setAmbient = function(r, g, b) {
			ar = r, ag = g, ab = b;
		};

		this.setDiffuse = function(r, g, b) {
			dr = r, dg = g, db = b;
		};

		this.setSpecular = function(r, g, b, a) {
			sr = r, sg = g, sb = b, sa = a;
		};

		var u_Pos = gl.getUniformLocation(gl.program, 'u_' + name + '_LightPos');
		if (u_Pos < 0)
			throw 'Failed to get location of u_' + name + '_LightPos';
		var u_Ambi = gl.getUniformLocation(gl.program, 'u_' + name + '_LightAmbi');
		if (u_Ambi < 0)
			throw 'Failed to get location of u_' + name + '_LightAmbi';
		var u_Diff = gl.getUniformLocation(gl.program, 'u_' + name + '_LightDiff');
		if (u_Diff < 0)
			throw 'Failed to get location of u_' + name + '_LightDiff';
		var u_Spec = gl.getUniformLocation(gl.program, 'u_' + name + '_LightSpec');
		if (u_Spec < 0)
			throw 'Failed to get location of u_' + name + '_LightSpec';

		this.set = function() {
			gl.uniform4f(u_Pos, x, y, z, 1.0);
			gl.uniform3f(u_Ambi, ar, ag, ab);
			gl.uniform3f(u_Diff, dr, dg, db);
			gl.uniform3f(u_Spec, sr, sg, sb);
		};
	};
	pointLight.prototype = new entity();
	object.prototype.pointLight = pointLight;

	return object;
};
ej = new (_class_entity_js())();