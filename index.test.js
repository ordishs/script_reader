const ScriptReader = require('./index')

test('Read', () => {
  const bytes = Buffer.from('4d050048656c6c6f', 'hex')
  const reader = ScriptReader(bytes)

  const data = reader.readPushData()

  console.log(data.toString())

  expect(data.toBe('hello'))
})

// const reader2 = ScriptReader(bytes)

// const data2 = reader2.decodeParts()

// console.log(data2.map(p => p.toString()))
