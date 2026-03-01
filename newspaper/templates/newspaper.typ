// Herald Daily Brief — Typst Template
// Inputs: date (string), newspaper-md (string path to combined.typ)

#let edition-date = sys.inputs.at("date", default: "Unknown Date")
#let newspaper-content = read(sys.inputs.at("newspaper-md"))

#set document(title: "Herald Daily Brief — " + edition-date)
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.8cm, right: 1.8cm),
  header: align(right)[_Herald Daily Brief_ — #edition-date],
  numbering: "1",
)
#set text(size: 10.5pt)
#set par(justify: true, leading: 0.65em)

// Masthead
#align(center)[
  #text(size: 28pt, weight: "bold")[Herald]
  #v(2pt)
  #text(size: 11pt)[Daily Intelligence Brief — #edition-date]
  #line(length: 100%, stroke: 0.5pt)
]

#v(8pt)

// Render the newspaper content as Typst markup
#eval(newspaper-content, mode: "markup")
