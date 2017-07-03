[..|select(.hz?)|{x:._attr.x, y:.hz,suite:._attr.suite}] as $data  
  | $data |  group_by(.suite)| [.[] | .[].suite] | unique as $suites
  | [ $suites | .[] as $suite 
      | ([$data | .[] | select(.suite == $suite) | .x] as $x 
      |  [$data | .[] | select(.suite == $suite) | .y] as $y 
      |  {name:$suite, x:$x, y:$y, mode: "lines+markers", type:"scatter"}) ]
