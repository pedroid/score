var Renderer = function(id) {
  canvas = document.getElementById(id)
  this.renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.RAPHAEL)
  this.ctx = this.renderer.getContext()
}

Renderer.prototype.clear = function() {
  this.ctx.clear()
}

Renderer.prototype.draw_stave = function(x, y, width, in_stave, options) {
  // Create new vexflow stave object
  var stave = new Vex.Flow.Stave(x, y, width);

  var options = options || {}
  var clef = options.clef || null
  var signature = options.signature || null
  var end_bar = options.end_bar || null

  // Add a clef if this stave has one
  if(clef) {
    stave.addClef(clef)
  }

  // Add a time signature if there is one
  if(signature) {
    stave.addTimeSignature(signature)
  }

  if(end_bar) {
    stave.setEndBarType(end_bar)
  }

  stave.setContext(this.ctx)
  stave.draw()

  // Create a voice
  var voice = new Vex.Flow.Voice({
    num_beats: 4,
      beat_value: 4,
      resolution: Vex.Flow.RESOLUTION
  });

  // Add notes to the voice
  voice.addTickables(in_stave.notes);

  // Format and justify the notes
  var formatter = new Vex.Flow.Formatter()
  formatter.joinVoices([voice])
  formatter.format([voice], width)
  formatter.formatToStave([voice], stave)

  // Draw the voice
  voice.draw(this.ctx, stave);

  // Draw any beams
  for(var i = 0; i < in_stave.beams.length; i++) {
    in_stave.beams[i].setContext(this.ctx).draw()
  }
}

Renderer.prototype.draw_score = function(score) {
  var measures_per_line = Math.floor(this.ctx.paper.width / score.measure_width)
  this.draw_stave(0, 0, score.measure_width, score.staves[0],
    {"clef":score.clef, "signature":score.signature})
  for(var k = 1; k < score.staves.length - 1; k++) {
    var x = score.measure_width * (k % measures_per_line)
    var y = score.measure_height * Math.floor(k / measures_per_line)
    if(k % measures_per_line == 0) {
      this.draw_stave(x, y, score.measure_width, score.staves[k], {"clef":score.clef})
    } else {
      this.draw_stave(x, y, score.measure_width, score.staves[k])
    }
  }

  if(score.staves.length > 1) {
    var k = score.staves.length - 1
    var x = score.measure_width * (k % measures_per_line)
    var y = score.measure_height * Math.floor(k / measures_per_line)
    this.draw_stave(x, y, score.measure_width, score.staves[k],
      {"end_bar":Vex.Flow.Barline.type.END})
  }
}

function make_note(name) {
  return new Vex.Flow.StaveNote({ keys: ["c/5"], duration: name})
}

function make_notes(str) {
  var notes = new Array()
  var str_notes = str.split(" ")
  for(var i = 0; i < str_notes.length; i++) {
    notes.push(this.make_note(str_notes[i]))
  }
  return notes
}

function make_beam(notes) {
  return new Vex.Flow.Beam(notes)
}

var Stave = function(notes) {
  this.notes = new Array()
  this.beams = new Array()

  // The beam stack is used to keep track of the notes that are a part of
  // each beam as we iterate through the tokens
  var beam_stack = new Array()

  // Create an alias for this object so that it can be referenced in the
  // following private functions.
  var stave = this

  var tokenize = function(str) {
    str = str.trim()
    str = str.replace(/8r/g, 'x')
    str = str.replace(/4r/g, 'X')
    str = str.replace(/\(/g, '( ')
    str = str.replace(/\)/g, ' )')
    str = str.replace(/  /g, ' ')
    str = str.replace(/x/g, '8r')
    str = str.replace(/X/g, '4r')
    return str.split(' ')
  }

  var start_beam = function() {
    beam_stack.push(new Array())
  }

  var end_beam = function() {
    var beam = beam_stack.pop()
    var notes = new Array()
    for(var j = 0; j < beam.length; j++) {
      notes.push(stave.notes[beam[j]])
    }
    stave.beams.push(make_beam(notes))
  }

  var add_note = function(token) {
    stave.notes.push(make_note(token))
    for(var j = 0; j < beam_stack.length; j++) {
      beam_stack[j].push(stave.notes.length - 1)
    }
  }

  // Iterate through the tokens and construct the notes and beams
  var token = null
  var tokens = tokenize(notes)
  for(var i = 0; i < tokens.length; i++) {
    token = tokens[i]
    switch (token)
    {
      case '(':
        start_beam()
        break
      case ')':
        end_beam()
        break
      default:
        add_note(token)
    }
  }
}

Stave.prototype.notes = function() {
  return this.notes
}

var Score = function(notes) {
  this.clef = "percussion"
  this.signature = "4/4"
  this.measure_height = 100
  this.measure_width = 300

  this.staves = new Array()
  var measures = notes.split("|")
  for(var i = 0; i < measures.length; i++) {
    this.staves.push(new Stave(measures[i].trim()))
  }
}

Score.prototype.clef = function() {
  return this.clef
}

Score.prototype.signature = function() {
  return this.signature
}

Score.prototype.shuffle = function() {
  this.staves = _.shuffle(this.staves)
}
