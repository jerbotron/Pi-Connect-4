import RPi.GPIO as GPIO
import time, threading

P_DATAPIN = 3
P_LATCHPIN = 5
P_CLOCKPIN = 7

N_DATAPIN = 19
N_LATCHPIN = 21
N_CLOCKPIN = 23

LED_OFF = 0
LED_GREEN = 1
LED_RED = 2
LED_ORANGE = 3

REFRESH_RATE = 0.00001

class ledMatrix(object):
    def __init__(self):
        GPIO.setmode(GPIO.BOARD)
        GPIO.setwarnings(False)

        GPIO.setup(P_DATAPIN, GPIO.OUT)
        GPIO.setup(P_LATCHPIN, GPIO.OUT)
        GPIO.setup(P_CLOCKPIN, GPIO.OUT)

        GPIO.setup(N_DATAPIN, GPIO.OUT)
        GPIO.setup(N_LATCHPIN, GPIO.OUT)
        GPIO.setup(N_CLOCKPIN, GPIO.OUT)

        # self.dataArray = [[LED_GREEN for i in range(5)] for j in range(8)]
        
        self.dataArray = [ 
                       [3,2,1,2,3],
                       [2,1,2,1,2],
                       [1,2,1,2,1],
                       [2,1,2,1,2],
                       [1,2,1,2,1],
                       [2,1,2,1,2],
                       [1,2,1,2,1],
                       [3,1,2,1,3]
                       ]

        self.N_GREEN_PINS = [8,6,4,2,0]
        self.N_RED_PINS = [9,7,5,3,1]
        self.update = True

    def updateDisplay(self, interval, col=0):
        self.updateColumn(col)
        col = col+1 if col < 4 else 0

        t = threading.Timer (
          interval,
          self.updateDisplay, [interval, col]
        ).start ()

    def dropPiece(self, i):
        self.dataArray[0][i] = LED_GREEN

    def updateColumn(self, col):
        # for col in range(5):
        self.update = False
        P_dataOutGreen = 0
        P_dataOutRed = 0
        N_dataOut = 0
        for i in range(8):
            pinState = self.dataArray[i][col]
            P_pinOn = 1 << i
            if pinState:
                if (pinState == LED_GREEN):
                    P_dataOutGreen = P_dataOutGreen | P_pinOn
                    P_dataOutRed = P_dataOutRed & ~P_pinOn

                elif (pinState == LED_RED):
                    P_dataOutRed = P_dataOutRed | P_pinOn
                    P_dataOutGreen = P_dataOutGreen & ~P_pinOn

                elif (pinState == LED_ORANGE):
                    P_dataOutGreen = P_dataOutGreen | P_pinOn
                    P_dataOutRed = P_dataOutRed | P_pinOn
            else:
                P_dataOutRed = P_dataOutRed & ~P_pinOn
                P_dataOutGreen = P_dataOutGreen & ~P_pinOn

        if (P_dataOutRed): N_dataOut = N_dataOut | (1<<self.N_RED_PINS[col])
        if (P_dataOutGreen): N_dataOut = N_dataOut | (1<<self.N_GREEN_PINS[col])

        GPIO.output(N_LATCHPIN, 0)
        self.shiftOut(N_DATAPIN, N_CLOCKPIN, ~0)
        self.shiftOut(N_DATAPIN, N_CLOCKPIN, ~0)
        GPIO.output(N_LATCHPIN, 1)

        GPIO.output(P_LATCHPIN, 0)
        self.shiftOut(P_DATAPIN, P_CLOCKPIN, P_dataOutGreen)
        self.shiftOut(P_DATAPIN, P_CLOCKPIN, P_dataOutRed)
        GPIO.output(P_LATCHPIN, 1)  

        GPIO.output(N_LATCHPIN, 0)
        self.shiftOut(N_DATAPIN, N_CLOCKPIN, ~(N_dataOut >> 8))
        self.shiftOut(N_DATAPIN, N_CLOCKPIN, ~N_dataOut)
        GPIO.output(N_LATCHPIN, 1)  

    def clearMatrix(self):
        self.dataArray = [[LED_OFF for i in range(5)] for j in range(8)]

    def shiftOut(self, dataPin, clockPin, data):
        pinState = 0

        GPIO.output(dataPin, 0);
        GPIO.output(clockPin, 0);

        for i in range(7,-1,-1):
            GPIO.output(clockPin, 0);
            if (data & (1 << i)):
                pinState = 1
            else:
                pinState = 0

            GPIO.output(dataPin, pinState)
            GPIO.output(clockPin, 1)
            GPIO.output(dataPin, 0)

        GPIO.output(clockPin, 0)

def main():
    matrix = ledMatrix()

    matrix.updateDisplay(REFRESH_RATE)
    # while (1):
    #     # matrix.updateColumn()
    #     pass

if __name__ == "__main__":
    main()
