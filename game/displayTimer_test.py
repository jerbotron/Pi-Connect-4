from threading import Timer,Thread,Event

class _Getch:
    def __init__(self):
        import tty, sys

    def __call__(self):
        import sys, tty, termios
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        return ch

class perpetualTimer():
   def __init__(self,t,hFunction, col):
      self.t = t
      self.hFunction = hFunction
      self.thread = Timer(self.t,self.handle_function, [col])

   def handle_function(self, col):
      self.hFunction(col)
      col = col + 1 if col < 4 else 0
      self.thread = Timer(self.t, self.handle_function, [col])
      self.thread.start()

   def start(self):
      self.thread.start()

   def cancel(self):
      self.thread.cancel()

def printer(col):
    pass
    # print col

t = perpetualTimer(0.0005, printer, 0)
t.start()

getch = _Getch()
while (1):
    g = getch()
    if g == "q":
        t.cancel()
        break

