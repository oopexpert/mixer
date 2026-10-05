package mixer.port.com;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fazecast.jSerialComm.SerialPort;

import mixer.port.PortAdapter;

public class JSerialCommPort implements PortAdapter {

    private static final Logger log = LoggerFactory.getLogger(JSerialCommPort.class);

    public static java.util.List<String> listAvailablePorts() {
        java.util.List<String> names = new java.util.ArrayList<>();
        for (SerialPort p : SerialPort.getCommPorts()) {
            names.add(p.getSystemPortName());
        }
        return names;
    }

    private final SerialPort port;

    private long lastSwitchTimestamp = 0L;
    private static final long MIN_SWITCH_INTERVAL_MS = 200;
    
    public JSerialCommPort(String portName) {
        this.port = SerialPort.getCommPort(portName);

        port.setBaudRate(9600);
        port.setNumDataBits(8);
        port.setNumStopBits(SerialPort.ONE_STOP_BIT);
        port.setParity(SerialPort.NO_PARITY);
        log.debug("COM-Port '{}' konfiguriert. Hardware-Seriennummer: {}", portName, port.getSerialNumber());
    }

    @Override
    public boolean open() {
        return port.openPort();
    }

    @Override
    public void close() {
        port.closePort();
    }

    private void write(byte[] data) {
        ensureMinSwitchInterval(()-> port.writeBytes(data, data.length));
    }
    
    private void ensureMinSwitchInterval(Runnable writeOperation) {
        long now = System.currentTimeMillis();
        long elapsed = now - lastSwitchTimestamp;

        if (elapsed < MIN_SWITCH_INTERVAL_MS) {
            try {
                Thread.sleep(MIN_SWITCH_INTERVAL_MS - elapsed);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(
                    "Interrupted while waiting for relay switch interval", e
                );
            }
        }

        writeOperation.run();
        lastSwitchTimestamp = System.currentTimeMillis();
    }
    
    @Override
    public boolean isOpen() {
        return port.isOpen();
    }

    @Override
    public String getPortName() {
        return port.getSystemPortName();
    }

	@Override
	public void start() {
	    write(new byte[]{(byte)0xA0, 0x01, 0x01, (byte)0xA2});
	}

	@Override
	public void stop() {
	    write(new byte[]{(byte)0xA0, 0x01, 0x00, (byte)0xA1});
	}
}