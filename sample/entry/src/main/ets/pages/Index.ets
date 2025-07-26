import { MyCustomComponent } from 'sample-library'

@Entry
@Component
struct Index {
  @State
  message: string = 'Hello World';

  build() {
    Row() {
      Column() {
        Text(this.message)
          .fontSize(50)
          .fontWeight(FontWeight.Bold)
          .textAlign(TextAlign.Center)

        MyCustomComponent()
      }.width('100%')
        .height(200)
        .accessibilityDescription('Test')
        .align(Alignment.Center)
    }.height('100%')
  }
}
