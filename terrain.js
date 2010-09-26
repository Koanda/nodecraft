var chunk = require('./chunk');
var sys = require('sys');

function WorldTerrain()
{
	this.chunk_xz_granularity = 16;

	// TODO - this masking solution only works for power of two chunks
	this.chunk_xz_mask = 0xF;
	this.chunk_xz_shift = 4;

	this.chunks = {};
}

/* Stubbed out with procedural terrain generator */
WorldTerrain.prototype.loadTerrain = function(x,z, done_callback) {
	var chunk_data = new chunk.Chunk();
	for (var x2 = 0; x2 < 16; x2++) {
		for (var y2 = 0; y2 < 128; y2++) {
			for (var z2 = 0; z2 < 16; z2++) {
				var threshold = 64 + Math.floor(Math.sin(Math.sqrt((x+x2)*(x+x2)+(z+z2)*(z + z2))/64) * 16);

				if (y2 == 0) {
					chunk_data.setType(x2, y2, z2, 0x07);
				} else if (y2 < threshold) {
					chunk_data.setType(x2, y2, z2, 0x03);
				} else if (y2 == threshold) {
					chunk_data.setType(x2, y2, z2, 0x02);
				} else {
					chunk_data.setType(x2, y2, z2, 0x00);
				}

				if (y2 > threshold)
					chunk_data.setLighting(x2, y2, z2, 0xf);
				else
					chunk_data.setLighting(x2, y2, z2, 0x0);
			}
		}
	}
	
	if (Math.floor(Math.random()*4) == 1)
	{
		/* add a tree */
		var tx = Math.floor(Math.random()*16);
		var tz = Math.floor(Math.random()*16);
		var th = Math.floor(Math.random()*6)+3;
		var ty;

		for (var i=127; i>=0; i--)
			if (chunk_data.getType(tx,i,tz) != 0)
			{
				ty = i;
				break;
			}
		

		for (var i=Math.floor(th/2); i<th+2; i++)
		{
			for (var j=-2; j<3; j++)
				for (var k=-2; k<3; k++)
				{
					if (j+tx < 0 || j+tx>15 || k+tz <0||k+tz>15)
						continue;
					chunk_data.setType(tx+j, i+ty, tz+k, 18);
				}
		}

		for (var i=1; i<=th; i++)
			chunk_data.setType(tx, i+ty, tz, 17);
		
	}

	this.chunks[[this.chunkIndex(x),this.chunkIndex(z)]] = chunk_data;
	done_callback(chunk_data);
}


WorldTerrain.prototype.getChunk = function(x, z, done_callback) {
	var x_i = this.chunkIndex(x);
	var z_i = this.chunkIndex(z);
	if (!this.chunks[[x_i,z_i]])
		this.loadTerrain(x, z, done_callback)
	else
		done_callback(this.chunks[[x_i,z_i]]);
}

WorldTerrain.prototype.chunkIndex = function(n)
{
	return n>>this.chunk_xz_shift;
}

WorldTerrain.prototype.getCellType = function(x,y,z, done_callback)
{	
	var me = this;

	this.getChunk(x, z,
			function(chunk_data) {
				var x_i = x&me.chunk_xz_mask;
				var z_i = z&me.chunk_xz_mask;
				done_callback(chunk_data.getType(x_i, y, z_i));
			});

}

WorldTerrain.prototype.setCellType = function(x,y,z,t)
{	
	var me = this;

	this.getChunk(x, z,
			function(chunk_data) {
				var x_i = x&me.chunk_xz_mask;
				var z_i = z&me.chunk_xz_mask;
				chunk_data.setType(x_i, y, z_i, t);
				if (t == 0) {
					// HACK ALERT: TODO - RECALCULATE LIGHTING / set deferred recalculate
					chunk_data.setLighting(x_i, y, z_i, 0xF);
					chunk_data.setLighting(x_i-1, y, z_i, 0xF);
					chunk_data.setLighting(x_i+1, y, z_i, 0xF);
					chunk_data.setLighting(x_i, y-1, z_i, 0xF);
					chunk_data.setLighting(x_i, y+1, z_i, 0xF);
					chunk_data.setLighting(x_i, y, z_i-1, 0xF);
					chunk_data.setLighting(x_i, y, z_i+1, 0xF);
				}
			});
}


WorldTerrain.prototype.getMaxHeight = function(x, z, done_callback) {
	var currentY = 127;
	var me = this;

	iterate = function(cell_code)
	{
		if (cell_code != 0x0 || currentY == 0)
		{
			done_callback(currentY);
			return;
		}
		currentY--;
		me.getCellType(x, currentY, z, iterate);
	}
	
	me.getCellType(x, currentY, z, iterate);
}

module.exports.WorldTerrain = WorldTerrain;
