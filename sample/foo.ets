@Entry
@Component
export struct Hello {
  build() {
    Column() {
      Text("Hello world") {
        World()
      }.width(200)
    }.width(100)
    .height(100)
    .backgroundColor(Color.Red)
  }
}

export struct World {
  hello = "Hello world"
}
