/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Wíragrindarteningur teiknaður tvisvar frá mismunandi
//     sjónarhorni til að fá víðsjónaráhrif (með gleraugum)
//
//    Hjálmtýr Hafsteinsson, febrúar 2022
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

var NumVertices  = 24;

var points = [];
var colors = [];

var vBuffer;
var vPosition;

var movement = false;     // Do we rotate?
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var stopping = false;
var stopped = false;

var myGrid;
var mySheep = [];
var myWolves = [];
var numOfFrames = 0;

var sizeN = 10;
var hradi = 60;
var starveCount = 10;
var birthCount = 10;
var killsRequired = 5;
var numOfSheep = 5;
var numOfWolves = 10;



var zDist = -3.0;

var proLoc;
var mvLoc;

// the 8 vertices of the cube
var v = [
    vec3( -0.5, -0.5,  0.5 ),
    vec3( -0.5,  0.5,  0.5 ),
    vec3(  0.5,  0.5,  0.5 ),
    vec3(  0.5, -0.5,  0.5 ),
    vec3( -0.5, -0.5, -0.5 ),
    vec3( -0.5,  0.5, -0.5 ),
    vec3(  0.5,  0.5, -0.5 ),
    vec3(  0.5, -0.5, -0.5 )
];

var lines = [ v[0], v[1], v[1], v[2], v[2], v[3], v[3], v[0],
              v[4], v[5], v[5], v[6], v[6], v[7], v[7], v[4],
              v[0], v[4], v[1], v[5], v[2], v[6], v[3], v[7]
            ];

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);
    colorCube();

    myGrid = new Grid();

    for(let i = 0; i < numOfSheep; i++){
        var rand1 =  Math.floor(Math.random()*sizeN);
        var rand2 =  Math.floor(Math.random()*sizeN);
        var rand3 =  Math.floor(Math.random()*sizeN);
        myGrid.setCell(rand1, rand2, rand3, 1);
        mySheep.push(new Sheep(rand1, rand2, rand3));
    }
    for(let i = 0; i < numOfWolves; i++){
        var rand1 =  Math.floor(Math.random()*sizeN);
        var rand2 =  Math.floor(Math.random()*sizeN);
        var rand3 =  Math.floor(Math.random()*sizeN);
        myGrid.setCell(rand1, rand2, rand3, 2);
        myWolves.push(new Wolf(rand1, rand2, rand3));
    }


    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, (24 + 36)*12, gl.STATIC_DRAW );

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(lines));
    gl.bufferSubData(gl.ARRAY_BUFFER, NumVertices*12, flatten(points));

    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    colorLoc = gl.getUniformLocation( program, "wireColor" );
    
    proLoc = gl.getUniformLocation( program, "projection" );
    mvLoc = gl.getUniformLocation( program, "modelview" );

    var proj = perspective( 50.0, 1.0, 0.2, 100.0 );
    gl.uniformMatrix4fv(proLoc, false, flatten(proj));
    
    //event listeners for mouse
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault();         // Disable drag and drop
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
    	    spinY = ( spinY + (origX - e.offsetX) ) % 360;
            spinX = ( spinX + (e.offsetY - origY) ) % 360;
            origX = e.offsetX;
            origY = e.offsetY;
        }
    } );
    
    // Event listener for keyboard
     window.addEventListener("keydown", function(e){
         switch( e.keyCode ) {
            case 38:	// upp ör
                zDist += 0.1;
                break;
            case 40:	// niður ör
                zDist -= 0.1;
                break;
         }
     }  );  

    // Event listener for mousewheel
     window.addEventListener("mousewheel", function(e){
         if( e.wheelDelta > 0.0 ) {
             zDist += 0.1;
         } else {
             zDist -= 0.1;
         }
     }  );  

    render();
}

function colorCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}


function quad(a, b, c, d) 
{
    var vertices = [
        vec3( -0.5, -0.5,  0.5 ),
        vec3( -0.5,  0.5,  0.5 ),
        vec3(  0.5,  0.5,  0.5 ),
        vec3(  0.5, -0.5,  0.5 ),
        vec3( -0.5, -0.5, -0.5 ),
        vec3( -0.5,  0.5, -0.5 ),
        vec3(  0.5,  0.5, -0.5 ),
        vec3(  0.5, -0.5, -0.5 )
    ];

    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
    }
}

class Sheep{
    constructor(X, Y, Z){
        this.x = X;
        this.y = Y;
        this.z = Z;
        this.moveCount = 0;
        myGrid.setCell[this.x, this.y,this.z];
    }
}

class Wolf{
    constructor(X, Y, Z){
        this.x = X;
        this.y = Y;
        this.z = Z;
        this.killCount = 0;
        this.moveCount = 0;
        myGrid.setCell[this.x, this.y,this.z];
    }
}

class Grid{
    constructor(){
        this.grid = [];
        for(let i = 0; i<sizeN; i++){
            this.grid[i] = [];
            for(let j = 0; j<sizeN; j++){
                this.grid[i][j] = [];
                for(let k = 0; k<sizeN; k++){
                    this.grid[i][j][k] = null;
                }
            }
        }
    }
    setCell(X, Y, Z, contents){
        this.grid[X][Y][Z] = contents;
    }
    getCell(X, Y, Z){
        return this.grid[X][Y][Z]; 
    }
}

function eatSheep(object){
    mySheep.forEach((sheep, index) => {
        if(object.x == sheep.x && object.y == sheep.y && object.z == sheep.z){
            mySheep.splice(index, 1);
            object.killCount++;
            object.moveCount = 0;
        }
    });
}

function moveSheep2(object){
    var direction = null;
    if(isBeingChased(object)){
        if(myGrid.getCell((object.x+1)%sizeN,object.y,object.z) == 2){
            direction = 1;
        }
        if(myGrid.getCell(((object.x-1)+sizeN)%sizeN,object.y,object.z) == 2){
            direction = 0;
        }
        if(myGrid.getCell(object.x,(object.y+1)%sizeN,object.z) == 2){
            direction = 3;
        }
        if(myGrid.getCell(object.x,((object.y-1)+sizeN)%sizeN,object.z) == 2){
            direction = 2;
        }
        if(myGrid.getCell(object.x,object.y,(object.z+1)%sizeN) == 2){
            direction = 5;
        }
        if(myGrid.getCell(object.x,object.y,((object.z-1)+sizeN)%sizeN) == 2){
            direction = 4;
        }
    
    }
    var move;
    var success = false;
    var casesChecked = [false, false, false, false, false, false];
    while(!success && (!casesChecked[0] || !casesChecked[1] || !casesChecked[2] || !casesChecked[3] || !casesChecked[4] || !casesChecked[5])){
        if(direction == null) direction = Math.floor(Math.random()*6);
        switch(direction){
            case 0:
                casesChecked[0] = true;
                move = object.x + 1;
                if(move > sizeN-1) move = 0;
                if(myGrid.getCell(move, object.y, object.z) != null) break;
                myGrid.setCell(move, object.y, object.z, 1);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.x = move;
                success = true;
                break;
            case 1:
                casesChecked[1] = true;
                move = object.x - 1;
                if(move < 0) move = sizeN -1;
                if(myGrid.getCell(move, object.y, object.z) != null) break;
                myGrid.setCell(move, object.y, object.z, 1);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.x = move;
                success = true;
                break;
            case 2:
                casesChecked[2] = true;
                move = object.y + 1;
                if(move > sizeN-1) move = 0;
                if(myGrid.getCell(object.x, move, object.z) != null) break;
                myGrid.setCell(object.x, move, object.z, 1);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.y = move;
                success = true;
                break;
            case 3:
                casesChecked[3] = true;
                move = object.y - 1;
                if(move < 0) move = sizeN -1;
                if(myGrid.getCell(object.x, move, object.z) != null) break;
                myGrid.setCell(object.x, move, object.z, 1);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.y = move;
                success = true;
                break;
            case 4:
                casesChecked[4] = true;
                move = object.z + 1;
                if(move > sizeN-1) move = 0;
                if(myGrid.getCell(object.x, object.y, move) != null) break;
                myGrid.setCell(object.x, object.y, move, 1);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.z = move;
                success = true;
                break;
            case 5:
                casesChecked[5] = true;
                move = object.z - 1;
                if(move < 0) move = sizeN -1;
                if(myGrid.getCell(object.x, object.y, move) != null) break;
                myGrid.setCell(object.x, object.y, move, 1);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.z = move;
                success = true;
                break;
        }
        direction = null;
    }

}

function isBeingChased(object){
    var chasing = false;
    myWolves.forEach(wolf => {
        if(object.x == wolf.x && object.y == wolf.y) chasing = true;
        else if(object.z == wolf.z && object.y == wolf.y) chasing = true;
        else if(object.x == wolf.x && object.z == wolf.z) chasing = true;
    });
    return chasing; 
}

function isChasing(object){
    var chasing = false;
    mySheep.forEach(sheep => {
        if(object.x == sheep.x && object.y == sheep.y) chasing = true;
        else if(object.z == sheep.z && object.y == sheep.y) chasing = true;
        else if(object.x == sheep.x && object.z == sheep.z) chasing = true;
    });
    return chasing;
}

function moveWolf(object){
    var direction = null;
    if(isChasing(object)){
        for(let i = 1; i<sizeN; i++){
            if(myGrid.getCell((object.x+i)%sizeN,object.y,object.z) == 1){
                direction = 0;
                break;
            }
            if(myGrid.getCell(((object.x-i)+sizeN)%sizeN,object.y,object.z) == 1){
                direction = 1;
                break;
            }
            if(myGrid.getCell(object.x,(object.y+i)%sizeN,object.z) == 1){
                direction = 2;
                break;
            }
            if(myGrid.getCell(object.x,((object.y-i)+sizeN)%sizeN,object.z) == 1){
                direction = 3;
                break;
            }
            if(myGrid.getCell(object.x,object.y,(object.z+i)%sizeN) == 1){
                direction = 4;
                break;
            }
            if(myGrid.getCell(object.x,object.y,((object.z-i)+sizeN)%sizeN) == 1){
                direction = 5;
                break;
            }
        }
    }
    var move;
    var success = false;
    var casesChecked = [false, false, false, false, false, false];
    while(!success && (!casesChecked[0] || !casesChecked[1] || !casesChecked[2] || !casesChecked[3] || !casesChecked[4] || !casesChecked[5])){
        if(direction == null) direction = Math.floor(Math.random()*6);
        switch(direction){
            case 0:
                casesChecked[0] = true;
                move = object.x + 1;
                if(move > sizeN-1) move = 0;
                if(myGrid.getCell(move, object.y, object.z) == 2) break;
                myGrid.setCell(move, object.y, object.z, 2);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.x = move;
                success = true;
                break;
            case 1:
                casesChecked[1] = true;
                move = object.x - 1;
                if(move < 0) move = sizeN -1;
                if(myGrid.getCell(move, object.y, object.z) == 2) break;
                myGrid.setCell(move, object.y, object.z, 2);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.x = move;
                success = true;
                break;
            case 2:
                casesChecked[2] = true;
                move = object.y + 1;
                if(move > sizeN-1) move = 0;
                if(myGrid.getCell(object.x, move, object.z) == 2) break;
                myGrid.setCell(object.x, move, object.z, 2);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.y = move;
                success = true;
                break;
            case 3:
                casesChecked[3] = true;
                move = object.y - 1;
                if(move < 0) move = sizeN -1;
                if(myGrid.getCell(object.x, move, object.z) == 2) break;
                myGrid.setCell(object.x, move, object.z, 2);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.y = move;
                success = true;
                break;
            case 4:
                casesChecked[4] = true;
                move = object.z + 1;
                if(move > sizeN-1) move = 0;
                if(myGrid.getCell(object.x, object.y, move) == 2) break;
                myGrid.setCell(object.x, object.y, move, 2);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.z = move;
                success = true;
                break;
            case 5:
                casesChecked[5] = true;
                move = object.z - 1;
                if(move < 0) move = sizeN -1;
                if(myGrid.getCell(object.x, object.y, move) == 2) break;
                myGrid.setCell(object.x, object.y, move, 2);
                myGrid.setCell(object.x, object.y, object.z, null);
                object.z = move;
                success = true;
                break;
        }
        direction = null;
    }
}

function birthASheepOrWolf(object, type){   
    var success = false;
    var casesChecked = [false, false, false, false, false, false];
    while(!success && (!casesChecked[0] || !casesChecked[1] || !casesChecked[2] || !casesChecked[3] || !casesChecked[4] || !casesChecked[5])){
        var direction = Math.floor(Math.random()*6);
        switch(direction){
            case 0:
                casesChecked[0] = true;
                if(myGrid.getCell((object.x+1)%sizeN,object.y,object.z) == null){
                    if(type == 1) mySheep.push(new Sheep((object.x+1)%sizeN,object.y,object.z));
                    else myWolves.push(new Wolf(object.x,object.y,((object.z-1)+sizeN)%sizeN));
                    myGrid.setCell((object.x+1)%sizeN,object.y,object.z, type);
                    success = true;
                }
                break;
            case 1:
                casesChecked[1] = true;
                if(myGrid.getCell(((object.x-1)+sizeN)%sizeN,object.y,object.z) == null){
                    if(type == 1) mySheep.push(new Sheep(((object.x-1)+sizeN)%sizeN,object.y,object.z));
                    else myWolves.push(new Wolf(object.x,object.y,((object.z-1)+sizeN)%sizeN));
                    myGrid.setCell(((object.x-1)+sizeN)%sizeN,object.y,object.z, type);
                    success = true;
                }
                break;
            case 2:
                casesChecked[2] = true;
                if(myGrid.getCell(object.x,(object.y+1)%sizeN,object.z) == null){
                    if(type == 1) mySheep.push(new Sheep(object.x,(object.y+1)%sizeN,object.z));
                    else myWolves.push(new Wolf(object.x,object.y,((object.z-1)+sizeN)%sizeN));
                    myGrid.setCell(object.x,(object.y+1)%sizeN,object.z,type);
                    success = true;
                }
                break;
            case 3:
                casesChecked[3] = true;
                if(myGrid.getCell(object.x,((object.y-1)+sizeN)%sizeN,object.z) == null){
                    if(type == 1) mySheep.push(new Sheep(object.x,((object.y-1)+sizeN)%sizeN,object.z));
                    else myWolves.push(new Wolf(object.x,object.y,((object.z-1)+sizeN)%sizeN));
                    myGrid.setCell(object.x,((object.y-1)+sizeN)%sizeN,object.z,1);
                    success = true;
                }
                break;
            case 4:
                casesChecked[4] = true;
                if(myGrid.getCell(object.x,object.y,(object.z+1)%sizeN) == null){
                    if(type == 1) mySheep.push(new Sheep(object.x,object.y,(object.z+1)%sizeN));
                    else myWolves.push(new Wolf(object.x,object.y,((object.z-1)+sizeN)%sizeN));
                    myGrid.setCell(object.x,object.y,(object.z+1)%sizeN,type);
                    success = true;
                }
                break;
            case 5:
                casesChecked[5] = true;
                if(myGrid.getCell(object.x,object.y,((object.z-1)+sizeN)%sizeN) == null){
                    if(type == 1) mySheep.push(new Sheep(object.x,object.y,((object.z-1)+sizeN)%sizeN));
                    else myWolves.push(new Wolf(object.x,object.y,((object.z-1)+sizeN)%sizeN));
                    myGrid.setCell(object.x,object.y,((object.z-1)+sizeN)%sizeN,type);
                    success = true;
                }
                break;
        }
    }
}

function restart(){
    stopping = true;
    setTimeout(initialize, 20);
}

function initialize(){
    if(!stopped){
        setTimeout(initialize, 20);
        return;
    }
    myGrid = new Grid();
    mySheep = [];
    myWolves = [];
    for(let i = 0; i < numOfSheep; i++){
        var rand1 =  Math.floor(Math.random()*sizeN);
        var rand2 =  Math.floor(Math.random()*sizeN);
        var rand3 =  Math.floor(Math.random()*sizeN);
        myGrid.setCell(rand1, rand2, rand3, 1);
        mySheep.push(new Sheep(rand1, rand2, rand3));
    }
    for(let i = 0; i < numOfWolves; i++){
        var rand1 =  Math.floor(Math.random()*sizeN);
        var rand2 =  Math.floor(Math.random()*sizeN);
        var rand3 =  Math.floor(Math.random()*sizeN);
        myGrid.setCell(rand1, rand2, rand3, 2);
        myWolves.push(new Wolf(rand1, rand2, rand3));
    }
    stopped = false;

    requestAnimFrame( render );
}


function render()
{
    if(stopping){
        stopped = true;
        stopping = false;
        return;
    }



    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    numOfFrames = (numOfFrames +1)%hradi;
    // Vinstra auga...
    var mv = lookAt( vec3(0.0, 0.0, zDist),
                      vec3(0.0, 0.0, zDist+2.0),
                      vec3(0.0, 1.0, 0.0) );
    mv = mult( mv, mult( rotateX(spinX), rotateY(spinY) ) );

    // Vinstri mynd er í rauðu...
    gl.uniform4fv( colorLoc, vec4(0.0, 0.0, 0.0, 0.7) );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays( gl.LINES, 0, NumVertices );
    

    gl.uniform4fv( colorLoc, vec4(236/255, 210/255, 162/255, 1.0) );
    mySheep.forEach(sheep => {
        mv2 = mult( mv, translate((sheep.x/sizeN)-0.5+(0.5*(1/sizeN)),(sheep.y/sizeN)-0.5+(0.5*(1/sizeN)),(sheep.z/sizeN)-0.5+(0.5*(1/sizeN))));    
        mv2 = mult( mv2, scalem(1/sizeN, 1/sizeN, 1/sizeN));
        gl.uniformMatrix4fv(mvLoc, false, flatten(mv2));
        gl.drawArrays( gl.TRIANGLES, NumVertices, 36);
        if(numOfFrames == (hradi/2-1)){
            moveSheep2(sheep);
            sheep.moveCount++;
            if(sheep.moveCount == birthCount){
                birthASheepOrWolf(sheep, 1);
                sheep.moveCount = 0;
            }
        }
        
    });
    

    gl.uniform4fv( colorLoc, vec4(71/255, 62/255, 43/255, 1.0) );
    var wolvestokill = [];
    myWolves.forEach((wolf, index) => {
        mv2 = mult( mv, translate((wolf.x/sizeN)-0.5+(0.5*(1/sizeN)),(wolf.y/sizeN)-0.5+(0.5*(1/sizeN)),(wolf.z/sizeN)-0.5+(0.5*(1/sizeN))));    
        mv2 = mult( mv2, scalem(1/sizeN, 1/sizeN, 1/sizeN));
        gl.uniformMatrix4fv(mvLoc, false, flatten(mv2));
        gl.drawArrays( gl.TRIANGLES, NumVertices, 36);
        if(numOfFrames == (hradi-1)){
            moveWolf(wolf);
            wolf.moveCount++;
            eatSheep(wolf);  
            if(wolf.moveCount == starveCount){
                wolvestokill.push(index);
            }       
            if(wolf.killCount == killsRequired){
                birthASheepOrWolf(wolf, 2);
                wolf.killCount = 0;
            }
        }
    });
    wolvestokill.sort().reverse();
    wolvestokill.forEach(wolf => {
        myWolves.splice(wolf, 1)
    });
    


    requestAnimFrame( render );
}

